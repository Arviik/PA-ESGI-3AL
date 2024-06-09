import express from "express";
import { invalidPath } from "./errors/invalid-path";
import { initUsers } from "./routes/users";
import {initAuth} from "./routes/auth";
import {initOrganizations} from "./routes/organizations";
import {initMembers} from "./routes/members";
import {initActivities} from "./routes/activities";
import {initAGS} from "./routes/ags";
import {initDocuments} from "./routes/documents";
import {initDonations} from "./routes/donations";
import {initVotes} from "./routes/votes";
import {initPolls} from "./routes/polls";
import {initChoices} from "./routes/choices";
import {initResourceType} from "./routes/resource-types";
import {initResource} from "./routes/resources";
import {initTask} from "./routes/tasks";
import {initAssignment} from "./routes/assignments";
import {initTaskResource} from "./routes/task-resources";

export const initRoutes = (app: express.Express) => {
    app.get("/health", (_req, res) => {
        res.status(200).json({ data: "200" });
    });

    initUsers(app);
    initAuth(app);
    initOrganizations(app)
    initMembers(app);
    initActivities(app);
    initAGS(app);
    initDocuments(app);
    initDonations(app);
    initVotes(app);
    initResourceType(app);
    initResource(app);
    initTask(app);
    initAssignment(app);
    initTaskResource(app);
    initPolls(app);
    initChoices(app)

    app.use(invalidPath);
};
