<?php
/**
 * Plugin Name: Ask Magic Mike Canonical Lead Bridge
 * Description: Explicit Gravity Forms forwarding plus an opt-in, consent-gated Google measurement bridge for Our Town Properties.
 * Version: 1.3.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Our Town Properties, Inc.
 * Text Domain: amm-canonical-bridge
 */

if (!defined('ABSPATH')) {
    exit;
}

final class AMM_Canonical_Lead_Bridge {
    private const VERSION = '1.3.0';
    private const STATUS_OPTION = 'amm_canonical_bridge_status_v1';
    private const RETRY_HOOK = 'amm_canonical_bridge_retry_v1';
    private const MAX_ATTEMPTS = 3;
    private const GOOGLE_MEASUREMENT_CONTAINER = 'GTM-KZMCSLTJ';
    private const GOOGLE_MEASUREMENT_COOKIE = 'vv_cookieconsent_status';
    private const CONSENT_CHANNELS = array('email', 'call', 'sms');
    private const CONSENT_REQUIRED_FORM_IDS = array(7);
    private const UNVERIFIED_CONSENT_VERSION = 'wordpress_gravity_forms_unverified_v1';
    private const UNVERIFIED_CONSENT_TEXT = 'Canonical communication consent language was not captured by this Gravity Forms submission; communication permissions are denied.';

    /** Exact audited Gravity Forms allowlist. No form is discovered or guessed. */
    private const FORM_MAP = array(
        1 => array('funnel' => 'chat', 'lead_type' => 'general_question', 'placement' => 'gravity_form_contact'),
        2 => array('funnel' => 'seller', 'lead_type' => 'seller_cash_offer', 'placement' => 'gravity_form_cash_offer'),
        3 => array('funnel' => 'home_value', 'lead_type' => 'home_value', 'placement' => 'gravity_form_home_value'),
        4 => array('funnel' => 'chat', 'lead_type' => 'agent_referral', 'placement' => 'gravity_form_recruiting'),
        5 => array('funnel' => 'renter', 'lead_type' => 'renter', 'placement' => 'gravity_form_rental_search'),
        6 => array('funnel' => 'renter', 'lead_type' => 'renter', 'placement' => 'gravity_form_short_term_rental'),
        7 => array('funnel' => 'buyer', 'lead_type' => 'buyer', 'placement' => 'gravity_form_property_alert'),
    );

    public static function boot(): void {
        add_action('wp_head', array(__CLASS__, 'render_measurement_gate'), 0);
        add_action('gform_after_submission', array(__CLASS__, 'after_submission'), 20, 2);
        add_action(self::RETRY_HOOK, array(__CLASS__, 'retry_entry'), 10, 3);
        add_action('admin_menu', array(__CLASS__, 'register_health_page'));
    }

    public static function activate(): void {
        if (get_option(self::STATUS_OPTION, null) === null) {
            add_option(self::STATUS_OPTION, array(), '', false);
        }
    }

    private static function enabledGlobally(): bool {
        return defined('AMM_CANONICAL_BRIDGE_ENABLED') && AMM_CANONICAL_BRIDGE_ENABLED === true;
    }

    private static function measurementEnabled(): bool {
        return defined('AMM_GOOGLE_MEASUREMENT_ENABLED') && AMM_GOOGLE_MEASUREMENT_ENABLED === true;
    }

    /**
     * Render a same-origin Basic Consent Mode loader before other head output.
     *
     * The loader is inert unless the existing cookie-choice provider records
     * the exact value "allow". It never creates dataLayer or contacts Google
     * for missing, denied, dismissed, malformed, or unknown consent state.
     * Legacy GTM head and noscript snippets must be removed before this flag is
     * enabled; the release verifier enforces that single-loader invariant.
     */
    public static function render_measurement_gate(): void {
        if (!self::measurementEnabled()) {
            return;
        }

        $asset_url = add_query_arg(
            'ver',
            self::VERSION,
            plugins_url('assets/amm-consent-gate.js', __FILE__)
        );
        printf(
            "\n<!-- AMM Basic Consent Gate %s: explicit allow only -->\n" .
            '<script id="amm-basic-consent-gate" data-amm-consent-gate="basic-v1" ' .
            'data-amm-gtm-container="%s" data-amm-consent-cookie="%s" ' .
            'data-no-optimize="1" data-cfasync="false" src="%s"></script>' . "\n",
            esc_attr(self::VERSION),
            esc_attr(self::GOOGLE_MEASUREMENT_CONTAINER),
            esc_attr(self::GOOGLE_MEASUREMENT_COOKIE),
            esc_url($asset_url)
        );
    }

    /**
     * Return the exact subset of audited forms approved for forwarding.
     *
     * A global enable flag without this allowlist remains fail-closed. The value
     * may be an array or a comma-separated string in wp-config.php, or a
     * comma-separated WORDPRESS_BRIDGE_FORM_IDS hosting environment variable.
     */
    private static function configuredFormIds(): array {
        $configured = defined('AMM_CANONICAL_BRIDGE_FORM_IDS')
            ? AMM_CANONICAL_BRIDGE_FORM_IDS
            : getenv('WORDPRESS_BRIDGE_FORM_IDS');
        if (is_string($configured)) {
            $configured = preg_split('/\s*,\s*/', trim($configured), -1, PREG_SPLIT_NO_EMPTY);
        } elseif (is_int($configured)) {
            $configured = array($configured);
        }
        if (!is_array($configured)) {
            return array();
        }

        $form_ids = array();
        foreach ($configured as $value) {
            $form_id = absint($value);
            if (isset(self::FORM_MAP[$form_id])) {
                $form_ids[$form_id] = $form_id;
            }
        }
        ksort($form_ids, SORT_NUMERIC);
        return array_values($form_ids);
    }

    private static function enabledForForm(int $form_id): bool {
        return self::enabledGlobally() && in_array($form_id, self::configuredFormIds(), true);
    }

    /**
     * Normalize exact per-form consent contracts supplied through wp-config.php
     * or a JSON hosting variable. Invalid entries are discarded so a required
     * form remains blocked instead of silently accepting ambiguous consent.
     */
    private static function configuredConsentContracts(): array {
        $configured = defined('AMM_CANONICAL_BRIDGE_CONSENT_CONTRACTS')
            ? AMM_CANONICAL_BRIDGE_CONSENT_CONTRACTS
            : getenv('WORDPRESS_BRIDGE_CONSENT_CONTRACTS');
        if (is_string($configured) && trim($configured) !== '') {
            $decoded = json_decode($configured, true);
            $configured = is_array($decoded) ? $decoded : array();
        }
        if (!is_array($configured)) {
            return array();
        }

        $contracts = array();
        foreach ($configured as $form_key => $candidate) {
            $form_id = absint($form_key);
            if (!isset(self::FORM_MAP[$form_id]) || !is_array($candidate)) {
                continue;
            }
            $version = sanitize_key((string) ($candidate['language_version'] ?? ''));
            $channels = $candidate['channels'] ?? null;
            if ($version === '' || !is_array($channels)) {
                continue;
            }

            $normalized_channels = array();
            foreach (self::CONSENT_CHANNELS as $channel) {
                $channel_contract = $channels[$channel] ?? null;
                if (!is_array($channel_contract)) {
                    continue;
                }
                $field_id = absint($channel_contract['field_id'] ?? 0);
                $language_sha256 = strtolower(trim((string) ($channel_contract['language_sha256'] ?? '')));
                if ($field_id < 1 || !preg_match('/^[a-f0-9]{64}$/', $language_sha256)) {
                    continue;
                }
                $normalized_channels[$channel] = array(
                    'field_id' => $field_id,
                    'language_sha256' => $language_sha256,
                    'required' => !empty($channel_contract['required']),
                );
            }
            if ($normalized_channels) {
                $contracts[$form_id] = array(
                    'language_version' => $version,
                    'channels' => $normalized_channels,
                );
            }
        }
        ksort($contracts, SORT_NUMERIC);
        return $contracts;
    }

    private static function fieldProperty($field, string $property, $fallback = null) {
        if (is_object($field) && isset($field->{$property})) {
            return $field->{$property};
        }
        if (is_array($field) && array_key_exists($property, $field)) {
            return $field[$property];
        }
        return $fallback;
    }

    private static function findField($form, int $field_id) {
        foreach ((array) ($form['fields'] ?? array()) as $field) {
            if (absint(self::fieldProperty($field, 'id', 0)) === $field_id) {
                return $field;
            }
        }
        return null;
    }

    private static function normalizedConsentText($field): string {
        $label = wp_strip_all_tags((string) self::fieldProperty($field, 'checkboxLabel', ''));
        $description = wp_strip_all_tags((string) self::fieldProperty($field, 'description', ''));
        $text = html_entity_decode(trim($label . ($description !== '' ? "\n" . $description : '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalized = preg_replace('/\s+/u', ' ', $text);
        return is_string($normalized) ? trim($normalized) : '';
    }

    private static function deniedConsentEvidence(): array {
        return array(
            'ok' => true,
            'error' => '',
            'consent' => false,
            'consent_email' => false,
            'consent_call' => false,
            'consent_sms' => false,
            'consent_language_version' => self::UNVERIFIED_CONSENT_VERSION,
            'consent_language_text' => self::UNVERIFIED_CONSENT_TEXT,
        );
    }

    /**
     * Validate the live Gravity Forms definition against the exact approved
     * contract before trusting any communication permission. Gravity Forms'
     * native Consent field stores checkbox state plus revision-backed text;
     * the bridge additionally pins the normalized displayed copy by SHA-256.
     */
    private static function consentEvidence($entry, $form, int $form_id): array {
        $contracts = self::configuredConsentContracts();
        $contract = $contracts[$form_id] ?? null;
        if (!is_array($contract)) {
            if (in_array($form_id, self::CONSENT_REQUIRED_FORM_IDS, true)) {
                return array('ok' => false, 'error' => 'consent_contract_missing');
            }
            return self::deniedConsentEvidence();
        }

        $grants = array('email' => false, 'call' => false, 'sms' => false);
        $language = array();
        foreach ($contract['channels'] as $channel => $channel_contract) {
            if (!in_array($channel, self::CONSENT_CHANNELS, true)) {
                return array('ok' => false, 'error' => 'consent_contract_channel_invalid');
            }
            $field_id = absint($channel_contract['field_id'] ?? 0);
            $field = self::findField($form, $field_id);
            if (!$field || (string) self::fieldProperty($field, 'type', '') !== 'consent') {
                return array('ok' => false, 'error' => 'consent_field_missing_or_wrong_type');
            }
            $visibility = (string) self::fieldProperty($field, 'visibility', 'visible');
            if (!empty(self::fieldProperty($field, 'adminOnly', false)) || !in_array($visibility, array('', 'visible'), true)) {
                return array('ok' => false, 'error' => 'consent_field_not_public');
            }
            if ((bool) self::fieldProperty($field, 'isRequired', false) !== (bool) $channel_contract['required']) {
                return array('ok' => false, 'error' => 'consent_field_required_state_mismatch');
            }
            $text = self::normalizedConsentText($field);
            if ($text === '' || !hash_equals((string) $channel_contract['language_sha256'], hash('sha256', $text))) {
                return array('ok' => false, 'error' => 'consent_language_hash_mismatch');
            }
            $checked = self::value($entry, $field_id . '.1') !== '';
            if (!empty($channel_contract['required']) && !$checked) {
                return array('ok' => false, 'error' => 'required_consent_not_recorded');
            }
            $grants[$channel] = $checked;
            $language[] = strtoupper($channel) . ': ' . $text;
        }

        return array(
            'ok' => true,
            'error' => '',
            'consent' => $grants['email'] || $grants['call'] || $grants['sms'],
            'consent_email' => $grants['email'],
            'consent_call' => $grants['call'],
            'consent_sms' => $grants['sms'],
            'consent_language_version' => (string) $contract['language_version'],
            'consent_language_text' => implode("\n", $language),
        );
    }

    private static function secret(): string {
        if (defined('AMM_CANONICAL_BRIDGE_SECRET') && is_string(AMM_CANONICAL_BRIDGE_SECRET)) {
            return trim(AMM_CANONICAL_BRIDGE_SECRET);
        }
        $environment = getenv('WORDPRESS_BRIDGE_SECRET');
        return is_string($environment) ? trim($environment) : '';
    }

    private static function endpoint(): string {
        $configured = defined('AMM_CANONICAL_BRIDGE_URL') && is_string(AMM_CANONICAL_BRIDGE_URL)
            ? AMM_CANONICAL_BRIDGE_URL
            : 'https://www.askmagicmike.com/api/leads';
        return esc_url_raw($configured);
    }

    public static function after_submission($entry, $form): void {
        $form_id = absint($form['id'] ?? 0);
        $entry_id = absint($entry['id'] ?? 0);
        if (!isset(self::FORM_MAP[$form_id]) || $entry_id < 1) {
            return;
        }

        if (!self::enabledGlobally()) {
            self::record_status($form_id, $entry_id, 'shadow_observed', 0, '', '', 'Forwarding disabled; entry remains in Gravity Forms.');
            return;
        }
        if (!self::enabledForForm($form_id)) {
            self::record_status($form_id, $entry_id, 'shadow_not_allowlisted', 0, '', '', 'Form is not enabled for canonical forwarding.');
            return;
        }

        self::forward($entry, $form, 1);
    }

    public static function retry_entry($form_id, $entry_id, $attempt): void {
        $form_id = absint($form_id);
        $entry_id = absint($entry_id);
        $attempt = absint($attempt);
        if (!self::enabledForForm($form_id) || !class_exists('GFAPI')) {
            return;
        }
        if ($entry_id < 1 || $attempt < 2 || $attempt > self::MAX_ATTEMPTS) {
            return;
        }
        $entry = GFAPI::get_entry($entry_id);
        $form = GFAPI::get_form($form_id);
        if (is_wp_error($entry) || !$form) {
            self::record_status($form_id, $entry_id, 'retry_source_missing', $attempt, '', '', 'Gravity Forms entry or form was unavailable.');
            return;
        }
        self::forward($entry, $form, $attempt);
    }

    private static function forward($entry, $form, int $attempt): void {
        $form_id = absint($form['id'] ?? 0);
        $entry_id = absint($entry['id'] ?? 0);
        $secret = self::secret();
        if (strlen($secret) < 32) {
            self::record_status($form_id, $entry_id, 'configuration_error', $attempt, '', '', 'Bridge secret is missing or too short.');
            return;
        }

        $consent = self::consentEvidence($entry, $form, $form_id);
        if (empty($consent['ok'])) {
            self::record_status($form_id, $entry_id, 'consent_contract_blocked', $attempt, '', '', sanitize_key((string) ($consent['error'] ?? 'consent_contract_invalid')));
            return;
        }

        $payload = self::map_payload($entry, $form_id, $consent);
        $body = wp_json_encode($payload, JSON_UNESCAPED_SLASHES);
        if (!is_string($body)) {
            self::record_status($form_id, $entry_id, 'mapping_error', $attempt, '', '', 'Payload encoding failed.');
            return;
        }
        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $entry_id . '.' . $body, $secret);
        $response = wp_remote_post(self::endpoint(), array(
            'timeout' => 15,
            'redirection' => 0,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Idempotency-Key' => 'gf:' . $form_id . ':' . $entry_id,
                'X-AMM-WP-Bridge' => 'v1',
                'X-AMM-WP-Timestamp' => $timestamp,
                'X-AMM-WP-Entry' => (string) $entry_id,
                'X-AMM-WP-Signature' => 'v1=' . $signature,
            ),
            'body' => $body,
            'data_format' => 'body',
        ));

        if (is_wp_error($response)) {
            self::record_status($form_id, $entry_id, 'retry_scheduled', $attempt, '', '', sanitize_text_field($response->get_error_code()));
            self::schedule_retry($form_id, $entry_id, $attempt);
            return;
        }

        $status_code = (int) wp_remote_retrieve_response_code($response);
        $response_body = json_decode((string) wp_remote_retrieve_body($response), true);
        $lead_id = is_array($response_body) ? sanitize_text_field((string) ($response_body['lead_id'] ?? '')) : '';
        $correlation_id = is_array($response_body) ? sanitize_text_field((string) ($response_body['correlation_id'] ?? '')) : '';
        if ($status_code >= 200 && $status_code < 300 && $lead_id !== '') {
            self::record_status($form_id, $entry_id, 'forwarded', $attempt, $lead_id, $correlation_id, '');
            return;
        }

        $retryable = $status_code === 0 || $status_code === 408 || $status_code === 429 || $status_code >= 500;
        $state = $retryable && $attempt < self::MAX_ATTEMPTS ? 'retry_scheduled' : 'forward_failed';
        self::record_status($form_id, $entry_id, $state, $attempt, '', $correlation_id, 'HTTP ' . $status_code);
        if ($retryable) {
            self::schedule_retry($form_id, $entry_id, $attempt);
        }
    }

    private static function schedule_retry(int $form_id, int $entry_id, int $attempt): void {
        if ($attempt >= self::MAX_ATTEMPTS) {
            return;
        }
        $delays = array(1 => 60, 2 => 300);
        $next_attempt = $attempt + 1;
        $args = array($form_id, $entry_id, $next_attempt);
        if (!wp_next_scheduled(self::RETRY_HOOK, $args)) {
            wp_schedule_single_event(time() + ($delays[$attempt] ?? 1800), self::RETRY_HOOK, $args);
        }
    }

    private static function map_payload($entry, int $form_id, array $consent): array {
        $config = self::FORM_MAP[$form_id];
        $name = self::name_value($entry, '1');
        $source_url = esc_url_raw(self::value($entry, 'source_url'));
        $address = self::address_value($entry, '6');
        $phone_field = $form_id === 1 ? '6' : '7';
        $question = self::question_value($entry, $form_id, $address);
        $query = array();
        if ($source_url !== '') {
            parse_str((string) wp_parse_url($source_url, PHP_URL_QUERY), $query);
        }
        $click_ids = array();
        foreach (array('gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid') as $click_id) {
            if (!empty($query[$click_id])) {
                $click_ids[$click_id] = sanitize_text_field(wp_unslash($query[$click_id]));
            }
        }
        $touch = array(
            'source' => sanitize_text_field(wp_unslash($query['utm_source'] ?? 'ourtownproperties')),
            'medium' => sanitize_text_field(wp_unslash($query['utm_medium'] ?? 'website_form')),
            'campaign' => sanitize_text_field(wp_unslash($query['utm_campaign'] ?? 'gravity_forms_bridge')),
            'landing_page' => $source_url,
        );
        $is_test = stripos($name . ' ' . $question, 'INTERNAL QA') !== false &&
            stripos($name . ' ' . $question, 'DO NOT CONTACT') !== false;

        return array(
            'funnel_type' => $config['funnel'],
            'lead_type' => $config['lead_type'],
            'lead_source_surface' => 'ourtownproperties',
            'name' => $name,
            'email' => sanitize_email(self::value($entry, '2')),
            'phone' => sanitize_text_field(self::value($entry, $phone_field)),
            'address' => $address,
            'property_address' => $address,
            'question' => $question,
            'notes' => 'Forwarded from Gravity Forms form ' . $form_id . ', entry ' . absint($entry['id'] ?? 0) . '.',
            'page_url' => $source_url,
            'idempotency_key' => 'gf:' . $form_id . ':' . absint($entry['id'] ?? 0),
            'is_test' => $is_test,
            'consent' => !empty($consent['consent']),
            'consent_email' => !empty($consent['consent_email']),
            'consent_call' => !empty($consent['consent_call']),
            'consent_sms' => !empty($consent['consent_sms']),
            'consent_language_version' => sanitize_key((string) ($consent['consent_language_version'] ?? self::UNVERIFIED_CONSENT_VERSION)),
            'consent_language_text' => sanitize_textarea_field((string) ($consent['consent_language_text'] ?? self::UNVERIFIED_CONSENT_TEXT)),
            'consent_source' => 'gravity_forms_' . $form_id,
            'attribution' => array(
                'source' => $touch['source'],
                'medium' => $touch['medium'],
                'campaign' => $touch['campaign'],
                'content' => 'gravity_form_' . $form_id,
                'parent_url' => $source_url,
                'landing_page' => $source_url,
                'placement_id' => $config['placement'],
                'first_touch' => $touch,
                'last_touch' => $touch,
                'click_ids' => $click_ids,
            ),
        );
    }

    private static function value($entry, string $key): string {
        return isset($entry[$key]) ? trim((string) $entry[$key]) : '';
    }

    private static function name_value($entry, string $field): string {
        $first = sanitize_text_field(self::value($entry, $field . '.3'));
        $last = sanitize_text_field(self::value($entry, $field . '.6'));
        $combined = trim($first . ' ' . $last);
        return $combined !== '' ? $combined : sanitize_text_field(self::value($entry, $field));
    }

    private static function address_value($entry, string $field): string {
        $parts = array();
        foreach (array('.1', '.2', '.3', '.4', '.5', '.6') as $suffix) {
            $value = sanitize_text_field(self::value($entry, $field . $suffix));
            if ($value !== '') {
                $parts[] = $value;
            }
        }
        return $parts ? implode(', ', $parts) : sanitize_text_field(self::value($entry, $field));
    }

    private static function question_value($entry, int $form_id, string $address): string {
        switch ($form_id) {
            case 1:
                return trim(sanitize_text_field(self::value($entry, '3')) . "\n" . sanitize_textarea_field(self::value($entry, '4')));
            case 2:
                return 'Cash/direct-purchase options request for ' . $address;
            case 3:
                return 'Broker-reviewed home-value request for ' . $address;
            case 4:
                return trim('Recruiting inquiry. License: ' . sanitize_text_field(self::value($entry, '8')) . '. Address: ' . $address);
            case 5:
            case 6:
            case 7:
                return sanitize_textarea_field(self::value($entry, '8')) ?: 'WordPress form inquiry.';
            default:
                return 'WordPress form inquiry.';
        }
    }

    private static function record_status(
        int $form_id,
        int $entry_id,
        string $state,
        int $attempt,
        string $lead_id,
        string $correlation_id,
        string $error
    ): void {
        $statuses = get_option(self::STATUS_OPTION, array());
        if (!is_array($statuses)) {
            $statuses = array();
        }
        $statuses[$form_id . ':' . $entry_id] = array(
            'form_id' => $form_id,
            'entry_id' => $entry_id,
            'state' => sanitize_key($state),
            'attempt' => $attempt,
            'lead_id' => sanitize_text_field($lead_id),
            'correlation_id' => sanitize_text_field($correlation_id),
            'error' => sanitize_text_field($error),
            'updated_at' => gmdate('c'),
        );
        if (count($statuses) > 100) {
            $statuses = array_slice($statuses, -100, null, true);
        }
        update_option(self::STATUS_OPTION, $statuses, false);
    }

    public static function register_health_page(): void {
        add_options_page(
            'AMM Canonical Bridge',
            'AMM Canonical Bridge',
            'manage_options',
            'amm-canonical-bridge',
            array(__CLASS__, 'render_health_page')
        );
    }

    public static function render_health_page(): void {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to view this page.', 'amm-canonical-bridge'));
        }
        $statuses = array_reverse((array) get_option(self::STATUS_OPTION, array()), true);
        $enabled_form_ids = self::configuredFormIds();
        $consent_contract_form_ids = array_keys(self::configuredConsentContracts());
        $signing_state = strlen(self::secret()) >= 32
            ? __('Configured', 'amm-canonical-bridge')
            : __('Missing or too short', 'amm-canonical-bridge');
        $measurement_mode = self::measurementEnabled()
            ? __('Enabled — explicit allow only', 'amm-canonical-bridge')
            : __('Disabled — no Google measurement loader', 'amm-canonical-bridge');
        if (!self::enabledGlobally()) {
            $mode = __('Shadow only — no forwarding', 'amm-canonical-bridge');
        } elseif (!$enabled_form_ids) {
            $mode = __('Configuration blocked — no forms allowlisted', 'amm-canonical-bridge');
        } else {
            $mode = sprintf(
                /* translators: %s is a comma-separated list of Gravity Forms IDs. */
                __('Enabled for forms: %s', 'amm-canonical-bridge'),
                implode(', ', $enabled_form_ids)
            );
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Ask Magic Mike Canonical Bridge', 'amm-canonical-bridge'); ?></h1>
            <p><strong><?php echo esc_html__('Mode:', 'amm-canonical-bridge'); ?></strong>
                <?php echo esc_html($mode); ?>
            </p>
            <p><strong><?php echo esc_html__('Version:', 'amm-canonical-bridge'); ?></strong> <?php echo esc_html(self::VERSION); ?></p>
            <p><strong><?php echo esc_html__('Signing secret:', 'amm-canonical-bridge'); ?></strong> <?php echo esc_html($signing_state); ?></p>
            <p><strong><?php echo esc_html__('Google measurement:', 'amm-canonical-bridge'); ?></strong> <?php echo esc_html($measurement_mode); ?></p>
            <p><strong><?php echo esc_html__('Consent contracts:', 'amm-canonical-bridge'); ?></strong>
                <?php echo esc_html($consent_contract_form_ids ? implode(', ', $consent_contract_form_ids) : __('None configured; consent-required forms remain blocked', 'amm-canonical-bridge')); ?>
            </p>
            <p><?php echo esc_html__('Legacy GTM head and noscript snippets must be removed before the measurement gate is enabled. The gate loads only GTM-KZMCSLTJ after the existing consent cookie equals allow.', 'amm-canonical-bridge'); ?></p>
            <p><?php echo esc_html__('Secrets remain in wp-config.php or the hosting environment and are never displayed here.', 'amm-canonical-bridge'); ?></p>
            <table class="widefat striped">
                <thead><tr><th>Form</th><th>Entry</th><th>State</th><th>Attempt</th><th>Canonical lead</th><th>Updated</th><th>Safe error</th></tr></thead>
                <tbody>
                <?php foreach (array_slice($statuses, 0, 50, true) as $status) : ?>
                    <tr>
                        <td><?php echo esc_html((string) ($status['form_id'] ?? '')); ?></td>
                        <td><?php echo esc_html((string) ($status['entry_id'] ?? '')); ?></td>
                        <td><?php echo esc_html((string) ($status['state'] ?? '')); ?></td>
                        <td><?php echo esc_html((string) ($status['attempt'] ?? '')); ?></td>
                        <td><?php echo esc_html((string) ($status['lead_id'] ?? '')); ?></td>
                        <td><?php echo esc_html((string) ($status['updated_at'] ?? '')); ?></td>
                        <td><?php echo esc_html((string) ($status['error'] ?? '')); ?></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$statuses) : ?><tr><td colspan="7">No observed entries yet.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
}

register_activation_hook(__FILE__, array('AMM_Canonical_Lead_Bridge', 'activate'));
AMM_Canonical_Lead_Bridge::boot();
