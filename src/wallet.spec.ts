import * as moxios from "moxios";
import * as assert from "assert";
import {ConflictError, GeneralError} from "./errors";
import {Waas} from "./waas";
import {Wallet} from "./wallet";
import {sandbox} from "./spec-helpers";
import axios from "axios";

sandbox();

describe("Wallet", function() {
    beforeEach(function() {
        this.waas = this.sandbox.createStubInstance(Waas);
        this.waas.wrap = (fn: any) => fn();
        this.waas.instance = this.sandbox.stub(axios, "create");
    });

    const dummyWalletName = "ae5de2d7-6314-463e-a470-0a47812fcbec";

    it("should construct an instance", function() {
        assert.ok(new Wallet(this.waas));
        assert.ok(new Wallet(this.waas, "some-name"));
    });

    it("should throw due to an invalid wallet name", function() {
        assert.throws(() => new Wallet(this.waas, 34 as any));
    });

    describe("Errors", function() {
        beforeEach(function() {
            moxios.install();

            // The suite's global beforeEach() stubs Axios.create(), which is useful for most tests,
            // but is counterproductive for this one. We don't want to simply stub an error with sinon, but test the real
            // error handling. So we use moxius and stub the response of an Http request only,
            // the rest of the Axios logic (especially the interceptor) is kept from the WaaS class.
            // However, that's only possible if we can create a real Axios object. Therefore we restore the stub here.
            // That's why this line must be placed before instantiating the WaaS object (that's where Axios.create() is called).
            this.waas.instance.restore();
            this.noAuthWaas = new Waas({clientId: "...", clientSecret: "...", subscription: "..."});
        });

        afterEach(function() {
            moxios.uninstall();
        });

        it("should throw a ConflictError for an occupied wallet name", async function() {
            moxios.stubRequest(/.*/, {
                status: 409,
                response: {},
            });
            const w = new Wallet(this.noAuthWaas);
            await assert.rejects(async () => w.create(dummyWalletName), ConflictError);
        });

        it("should throw a GeneralError for any other errors", async function() {
            const status = 418;
            const message = "ban earl grey";
            moxios.stubRequest(/.*/, {
                status,
                response: {message},
            });
            const w = new Wallet(this.noAuthWaas);
            await assert.rejects(async () => w.create(dummyWalletName), e => {
                assert.ok(e instanceof GeneralError);
                assert.strictEqual(e.status, status)
                assert.strictEqual(e.message, message)
                return true;
            });
        });
    });

    describe("wallet", function() {
        it("should throw for missing wallet name in the constructor", function() {
            const w = new Wallet(this.waas);
            assert.throws(() => w.wallet);
        });
    });

    describe("list", function() {
        it("should not throw when called without arguments", async function() {
            const stub = this.waas.instance.get = this.sandbox.stub().resolvesArg(0);
            await new Wallet(this.waas).list();
            assert.ok(stub.alwaysCalledWithExactly("wallet"));
        });

        it("should verify the skiptoken was passed to the api call", async function() {
            const stub = this.waas.instance.get = this.sandbox.stub().resolvesArg(0);
            await new Wallet(this.waas).list("123");
            stub.alwaysCalledWithExactly([/wallet?skiptoken=123/]);
        });

        it("should throw on invalid skiptoken", async function() {
            const stub = this.waas.instance.post = this.sandbox.stub().resolvesArg(0);
            const w = new Wallet(this.waas);
            await assert.rejects(async () => w.list(123 as any), /Expected \?String, got Number 123/);
            assert.strictEqual(stub.callCount, 0);
        });
    });

    describe("create", function() {
        it("should not throw for missing parameters", async function() {
            const stub = this.waas.instance.post = this.sandbox.stub().resolves();
            const w = new Wallet(this.waas);
            await assert.doesNotReject(async () => w.create());
            await assert.doesNotReject(async () => w.create("some-wallet"));
            assert.strictEqual(stub.callCount, 2);
        });
    });

    describe("delete", function() {
        it("should execute the api call", async function() {
            const stub = this.waas.instance.delete = this.sandbox.spy();
            await new Wallet(this.waas, dummyWalletName).delete();
            assert.strictEqual(stub.callCount, 1);
        });
    });

    describe("get", function() {
        it("should execute the api call", async function() {
            const stub = this.waas.instance.get = this.sandbox.spy();
            await new Wallet(this.waas, dummyWalletName).get();
            assert.strictEqual(stub.callCount, 1);
        });
    });

    describe("eth", function() {
        it("should return an EthWallet instance", async function() {
            const w = new Wallet(this.waas, dummyWalletName);
            assert.strictEqual(w.eth().wallet, dummyWalletName);
        });
    });

    describe("btc", function() {
        it("should return an BtcWallet instance", async function() {
            const w = new Wallet(this.waas, dummyWalletName);
            assert.strictEqual(w.btc().wallet, dummyWalletName);
        });
    });
});
