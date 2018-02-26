import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { LoggingConfig } from "@atomist/automation-client/internal/util/logger";

import {BlackDuckService} from "../../src/blackDuck/BlackDuckService";

LoggingConfig.format = "cli";

describe("BlackDuckService", () => {

    const blackDuck = new BlackDuckService(
        "http://bdHub.com",
        "user1",
        "password",
    );

    const expectedRiskProfile = {
  categories: {
    ACTIVITY: {
      HIGH: 1,
      LOW: 2,
      MEDIUM: 3,
      OK: 4,
      UNKNOWN: 0,
    },
  },
};

    const dhApiUrl = "http://bdHub.com";

    it("should retrieve existing risk profile", done => {
        const mock = new MockAdapter(axios);
        mock.onPost(`${dhApiUrl}/j_spring_security_check`)
            .replyOnce(200, {}, { "set-cookie": ["AUTH123;path=/;HttpOnly"] })
            .onGet(`${dhApiUrl}/api/projects`, { params: { q: "name:project1" }}).replyOnce(200, {
            items: [{
                name: "project1",
                _meta: {
                    links: [{
                        rel: "versions",
                        href: "http://bdHub.com/api/versions",
                    }],
                },
            }],
        })
            .onGet(`${dhApiUrl}/api/versions`, { params: { q: "versionName:1.0.3" }}).replyOnce(200, {
            items: [{
                versionName: "1.0.3",
                _meta: {
                    links: [{
                        rel: "riskProfile",
                        href: "http://bdHub.com/api/riskProfile",
                    }],
                },
            }],
        })
            .onGet(`${dhApiUrl}/api/riskProfile`).replyOnce(200, {
            categories: {
                ACTIVITY: {
                    HIGH: 1,
                    LOW: 2,
                    MEDIUM: 3,
                    OK: 4,
                    UNKNOWN: 0,
                },
            },
        });

        blackDuck.getRiskProfile("project1",
            "1.0.3").then(riskProfile => {
            assert.deepEqual(riskProfile, expectedRiskProfile);
        }).then(done, done);
    }).timeout(50000);

    it("should fail retrieval for missing project", done => {
        const mock = new MockAdapter(axios);
        mock.onPost(`${dhApiUrl}/j_spring_security_check`)
            .replyOnce(200, {}, { "set-cookie": ["AUTH123;path=/;HttpOnly"] })
            .onGet(`${dhApiUrl}/api/projects`, { params: { q: "name:does-not-exist" }}).replyOnce(200, {
            items: [],
        });

        blackDuck.getRiskProfile("does-not-exist",
            "1.0.3").then(riskProfile => {
            assert.deepEqual(riskProfile, undefined);
        }).then(done, done);
    }).timeout(50000);

    it("should fail retrieval for missing version", done => {
        const mock = new MockAdapter(axios);
        mock.onPost(`${dhApiUrl}/j_spring_security_check`)
            .replyOnce(200, {}, { "set-cookie": ["AUTH123;path=/;HttpOnly"] })
            .onGet(`${dhApiUrl}/api/projects`, { params: { q: "name:project1" }}).replyOnce(200, {
            items: [{
                name: "project1",
                _meta: {
                    links: [{
                        rel: "versions",
                        href: "http://bdHub.com/api/versions",
                    }],
                },
            }],
        })
            .onGet(`${dhApiUrl}/api/versions`, { params: { q: "versionName:DNE" }}).replyOnce(200, {
            items: [],
        });
        blackDuck.getRiskProfile("project1",
            "DNE").then(riskProfile => {
            assert.deepEqual(riskProfile, undefined);
        }).then(done, done);
    }).timeout(50000);

});
