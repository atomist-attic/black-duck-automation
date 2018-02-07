import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter = require("axios-mock-adapter");

import { EventFired } from "@atomist/automation-client/Handlers";

import {RiskProfile} from "../../src/blackDuck/BlackDuckService";
import {RetrieveBlackDuckRiskProfileOnStatus} from "../../src/events/RetrieveBlackDuckRiskProfileOnStatus";
import {BlackDuckStatus} from "../../src/typings/types";

describe("RetrieveBlackDuckRiskProfileOnStatus", () => {

    const handler = new class extends RetrieveBlackDuckRiskProfileOnStatus {
        public teamId = "team123";

        protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string): Promise<RiskProfile> {
            return Promise.resolve({
                categories: [{
                    vulnerabilities: {
                        url,
                        projectName,
                        projectVersion,
                    },
                }],
            } as RiskProfile);
        }
    }();

    it("should find risk profile and send fingerprint", done => {
        const event = {
            data: {
                Status: [{
                    context: "black-duck/hub-detect",
                    state: "success",
                    targetUrl: "http://bdHub.com",
                    commit: {
                        sha: "123",
                        repo: {
                            name: "project1",
                            owner: "atomisthq",
                        },
                        fingerprints: [{
                            name: "ProjectIdentification",
                            data: `{
                                "group": "atomist",
                                "name": "p1",
                                "version": "1.0.3"
                            }`,
                        }],
                    },
                }],
            },
        } as EventFired<BlackDuckStatus.Subscription>;

        const mock = new MockAdapter(axios);
        mock.onPost(`http://webhook.atomist.com/atomist/fingerprints/teams/team123`)
            .replyOnce(config => {
                const expectedRequest = {
                    commit: {
                        provider: "https://www.github.com",
                        owner: "atomisthq",
                        repo: "project1",
                        sha: "123",
                    },
                    fingerprints: [{
                        name: "BlackDuckRiskProfile",
                        version: "1.0",
                        abbrevation: "bdrp",
                        data: {
                            categories: [{
                                vulnerabilities: {
                                    url: "http://bdHub.com",
                                    projectName: "p1",
                                    projectVersion: "1.0.3",
                                },
                            }],
                        },
                    }],
                };
                assert.deepEqual(JSON.parse(config.data), expectedRequest);
                return [200];
            });

        handler.handle(event, undefined)
            .then(() => { done(); }, done);
    });

});
