import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import { createServer, type Server } from "node:http";
import { POST } from "../../app/api/nfts/certifications/mint/route";

let server: Server;
let baseUrl: string;
let authorizationStatus = 200;
let genesisHash = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
let account: object | null = null;
let rpcMethods: string[];
let bodyReceived: Record<string, unknown>;
const player = Keypair.generate();

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/v1/certificates/mint-authorization") {
      bodyReceived = JSON.parse(raw);
      res.statusCode = authorizationStatus;
      res.end(
        JSON.stringify({
          authorized: true,
          wallet_address: bodyReceived.player,
          level: bodyReceived.level,
        })
      );
    } else if (req.url?.endsWith("/status")) {
      res.end(JSON.stringify({ completed: false }));
    } else {
      const payload = JSON.parse(raw);
      rpcMethods.push(payload.method);
      const result =
        payload.method === "getGenesisHash"
          ? genesisHash
          : { context: { slot: 1 }, value: account };
      res.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test server");
  baseUrl = `http://127.0.0.1:${address.port}`;
  process.env.SOLBREACH_BACKEND_URL = baseUrl;
  process.env.SOLANA_RPC_URL = baseUrl;
  process.env.MERKLE_TREE_ADDRESS = Keypair.generate().publicKey.toBase58();
  process.env.ADMIN_PRIVATE_KEY = JSON.stringify(
    Array.from(Keypair.generate().secretKey)
  );
});
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
test.beforeEach(() => {
  rpcMethods = [];
  authorizationStatus = 200;
  genesisHash = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
  account = null;
});

function request(level: number, overrides = {}, token = "test-session") {
  return new NextRequest(
    "https://beta.solbreach.com/api/nfts/certifications/mint",
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({
        level,
        cluster: "devnet",
        player: player.publicKey.toBase58(),
        mintAuthorizationSignature: "signed-message",
        mintAuthorizationNonce: "a".repeat(32),
        mintAuthorizationIssuedAt: Math.floor(Date.now() / 1000),
        ...overrides,
      }),
    }
  );
}

for (const level of [0, 1, 2, 3]) {
  test(`level ${level} rejects missing session`, async () => {
    expect((await POST(request(level, {}, ""))).status).toBe(401);
    expect(rpcMethods).toEqual([]);
  });
  test(`level ${level} cannot mint without completed certificate; client RPC/tree ignored`, async () => {
    const response = await POST(
      request(level, {
        rpcUrl: "https://attacker.invalid",
        merkleTree: "attacker-tree",
      })
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("does not exist");
    expect(rpcMethods).toEqual(["getGenesisHash", "getAccountInfo"]);
    expect(bodyReceived.level).toBe(level);
  });
}
test("rejects non-devnet clusters before authorization or signing", async () => {
  expect((await POST(request(1, { cluster: "mainnet-beta" }))).status).toBe(
    400
  );
  expect(rpcMethods).toEqual([]);
});

for (const status of [401, 403, 409, 429]) {
  test(`backend rejection ${status} never reaches the mint RPC`, async () => {
    authorizationStatus = status;
    expect((await POST(request(2))).status).toBe(status);
    expect(rpcMethods).toEqual([]);
  });
}
test("server RPC on a different network fails closed", async () => {
  genesisHash = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
  const response = await POST(request(0));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain(
    "must point to Solana devnet"
  );
  expect(rpcMethods).toEqual(["getGenesisHash"]);
});
test("an account at the expected address with the wrong owner cannot certify completion", async () => {
  account = {
    data: [Buffer.alloc(136).toString("base64"), "base64"],
    executable: false,
    owner: Keypair.generate().publicKey.toBase58(),
    lamports: 1000000,
    rentEpoch: 0,
  };
  const response = await POST(request(0));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain(
    "owner, type, player or level is invalid"
  );
});
