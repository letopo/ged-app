// Description des appareils connectés à partir du User-Agent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeDevice, clientIp } from '../../src/utils/deviceLabel.js';

const UA = {
  chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsungTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0',
};

test('navigateurs et systèmes courants', () => {
  assert.deepEqual(describeDevice(UA.chromeWindows), { browser: 'Chrome', os: 'Windows', type: 'desktop' });
  assert.deepEqual(describeDevice(UA.edgeWindows), { browser: 'Edge', os: 'Windows', type: 'desktop' });
  assert.deepEqual(describeDevice(UA.chromeAndroid), { browser: 'Chrome', os: 'Android', type: 'mobile' });
  assert.deepEqual(describeDevice(UA.samsungTablet), { browser: 'Samsung Internet', os: 'Android', type: 'tablet' });
  assert.deepEqual(describeDevice(UA.safariIphone), { browser: 'Safari', os: 'iPhone', type: 'mobile' });
  assert.deepEqual(describeDevice(UA.firefoxMac), { browser: 'Firefox', os: 'macOS', type: 'desktop' });
});

test('User-Agent absent ou inconnu', () => {
  assert.deepEqual(describeDevice(null), { browser: null, os: null, type: 'desktop' });
  assert.deepEqual(describeDevice('curl/8.0'), { browser: null, os: null, type: 'desktop' });
});

test('IP du client sans préfixe IPv6 mappé', () => {
  assert.equal(clientIp({ ip: '::ffff:192.168.1.42' }), '192.168.1.42');
  assert.equal(clientIp({ ip: '10.0.0.5' }), '10.0.0.5');
  assert.equal(clientIp({}), null);
});
