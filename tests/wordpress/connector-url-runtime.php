<?php
// Isolated PHP execution of the real connector URL/shortcode functions. These
// narrow WordPress stubs are not installed WordPress/Beaver or live-page proof.
define('ABSPATH', __DIR__);
function register_activation_hook(...$args) {}
function add_action(...$args) {}
function add_shortcode(...$args) {}
function get_option($key, $default = false) { return $default; }
function wp_parse_args($args, $defaults) { return array_merge($defaults, $args); }
function sanitize_text_field($value) { return trim(strip_tags((string)$value)); }
function sanitize_textarea_field($value) { return sanitize_text_field($value); }
function sanitize_key($value) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string)$value)); }
function sanitize_html_class($value) { return preg_replace('/[^A-Za-z0-9_\-]/', '', (string)$value); }
function esc_url_raw($value) { return (string)$value; }
function wp_parse_url($value) { return parse_url($value); }
function untrailingslashit($value) { return rtrim($value, '/'); }
function add_query_arg($args, $url) { return $url . '?' . http_build_query($args, '', '&', PHP_QUERY_RFC3986); }
function shortcode_atts($defaults, $atts, $tag) { return array_intersect_key($atts, $defaults) + $defaults; }
function esc_attr($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
require __DIR__ . '/../../wordpress/ask-magic-mike-connector/ask-magic-mike-connector.php';
$checks = 0;
function check($ok, $label) {
    global $checks;
    if (!$ok) { fwrite(STDERR, "FAIL: " . $label . "\n"); exit(1); }
    $checks++;
}
$old = amm_connector_build_url('/home-value', 'home_value_page', '', array(
    'utm_source' => 'ourtownproperties', 'utm_medium' => 'owned_media',
    'utm_campaign' => 'amm_owned_demand_2026', 'utm_content' => 'wordpress_home_value_page'));
check($old === 'https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page', 'old Home Value URL is byte-compatible');
foreach (array('as-is', 'compare', 'guidance') as $option) {
    foreach (array('/sell', '/we-buy-houses') as $route) {
        $url = amm_connector_build_url($route, 'seller_page_cta', '', array('utm_medium' => 'owned_media'), $option);
        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        check($query['seller_option'] === $option && $query['utm_medium'] === 'owned_media', 'allowed goal independent of UTM medium');
    }
}
foreach (array('', 'guaranteed-offer', 'as-is!', 'AS-IS', 'https://unowned.invalid', array('as-is')) as $bad) {
    check(strpos(amm_connector_build_url('/sell', 'seller_page_cta', '', array(), $bad), 'seller_option') === false, 'unknown goals omitted');
}
foreach (array('/home-value', '/buy', '/widget/v1', '/embed/ask') as $route) {
    check(strpos(amm_connector_build_url($route, 'legacy', '', array(), 'as-is'), 'seller_option') === false, 'goal cannot change another intake');
}
$html = amm_connector_cta_shortcode(array('route' => '/sell', 'seller_option' => 'compare',
    'headline' => 'Explore your selling options.', 'text' => 'Request a property review.', 'button_text' => 'Review options'));
check(strpos($html, 'seller_option=compare') !== false, 'shortcode passes explicit goal');
check(substr_count($html, '<a ') === 1 && strpos($html, 'data-amm-link="1"') !== false, 'one functional native link without JavaScript');
check(strpos($html, 'data-amm-connector-version="1.2.0"') !== false, 'candidate marker');
check(strpos(amm_connector_cta_shortcode(array('source' => 'legacy')), 'seller_option') === false, 'old shortcode stays opt-out');
echo 'PASS ' . $checks . " isolated PHP connector assertions; no WordPress mutation or provider call.\n";
