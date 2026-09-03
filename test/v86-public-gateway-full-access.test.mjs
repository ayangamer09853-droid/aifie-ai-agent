import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicGatewayStatus,
  getLocalLanIpAddress,
  setPublicGatewayUrl
} from "../src/public-gateway-manager.mjs";

test("Public Gateway Manager returns valid global HTTPS URL and local LAN address", () => {
  const status = getPublicGatewayStatus({ port: 8787 });
  assert.equal(status.gatewayStatus, "PUBLIC_GATEWAY_ONLINE");
  assert.equal(status.isPubliclyAccessible, true);
  assert.ok(status.publicHttpsUrl.startsWith("https://"));
  assert.ok(status.localLanUrl.includes(":8787"));
  assert.ok(status.wsLiveStreamUrl.startsWith("wss://") || status.wsLiveStreamUrl.startsWith("ws://"));

  const lanIp = getLocalLanIpAddress();
  assert.ok(typeof lanIp === "string" && lanIp.length > 6);

  setPublicGatewayUrl("https://3bcfba236278b9.lhr.life");
  assert.equal(getPublicGatewayStatus().publicHttpsUrl, "https://3bcfba236278b9.lhr.life");
});
