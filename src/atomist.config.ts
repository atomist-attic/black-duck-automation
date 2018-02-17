/*
 * Copyright © 2017 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Configuration } from "@atomist/automation-client";
import * as appRoot from "app-root-path";

// tslint:disable-next-line:no-var-requires
const pj = require(`${appRoot}/package.json`);

const token = process.env.GITHUB_TOKEN;
const team = process.env.ATOMIST_TEAM;
const teamIds = (team) ? [team] : [];

const blackDuckUser = process.env.BLACK_DUCK_USER;
const blackDuckPassword = process.env.BLACK_DUCK_PASSWORD;

export const configuration: any = {
    name: pj.name,
    version: pj.version,
    keywords: ["atomist", "black duck"],
    teamIds,
    token,
    blackDuck: {
        user: blackDuckUser,
        password: blackDuckPassword,
    },
    http: {
        enabled: true,
        auth: {
            basic: {
                enabled: false,
            },
            bearer: {
                enabled: false,
            },
        },
    },
};
