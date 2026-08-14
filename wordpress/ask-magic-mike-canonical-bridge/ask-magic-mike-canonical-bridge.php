<?php
/**
 * Plugin Name: Ask Magic Mike Canonical Lead Bridge
 * Description: Explicit Gravity Forms to Ask Magic Mike forwarding with HMAC signing, idempotency, retries, and reconciliation status.
 * Version: 1.1.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Our Town Properties, Inc.
 * Text Domain: amm-canonical-bridge
 */

if (!defined('ABSPATH')) {
    exit;
}

final class AMM_Canonical_Lead_Bridge {
    private const VERSION = '1.1.0';
    private const STATUS_OPTION = 'amm_canonical_bridge_status_v1';
    private const RETRY_HOOK = 'amm_canonical_bridge_retry_v1';
    private const MAX_ATTEMPTS = 3;

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

        $payload = self::map_payload($entry, $form_id);
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

    private static function map_payload($entry, int $form_id): array {
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
            'consent' => false,
            'consent_email' => false,
            'consent_call' => false,
            'consent_sms' => false,
            'consent_language_version' => 'wordpress_gravity_forms_unverified_v1',
            'consent_language_text' => 'Canonical communication consent language was not captured by this Gravity Forms submission; communication permissions are denied.',
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
        $signing_state = strlen(self::secret()) >= 32
            ? __('Configured', 'amm-canonical-bridge')
            : __('Missing or too short', 'amm-canonical-bridge');
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
