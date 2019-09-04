
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import * as child_process from "child_process";
import * as properties from "properties";

export interface ProjectProperties {
    group: string;
    name: string;
    version: string;
}

export class ProjectPropertiesExtractor {

    public getProjectProperties(project: LocalProject): ProjectProperties {
        if (project.fileExistsSync("gradlew")) {
            return this.getGradleProjectProperties(project);
        }
    }

    public getGradleProjectProperties(project: LocalProject): ProjectProperties {
        const gradleBuildPropertiesText = this.executeCommand(project.baseDir, `./gradlew properties`);
        const gradleBuildProperties = properties.parse(gradleBuildPropertiesText);
        return {
            group: gradleBuildProperties.group,
            name: gradleBuildProperties.name,
            version: gradleBuildProperties.version,
        };
    }

    protected executeCommand(cwd: string, command: string): string {
        return child_process.execSync(command, {cwd, env: process.env}).toString();
    }
}
