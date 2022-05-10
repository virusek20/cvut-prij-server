'use strict';

import {v4} from "uuid";
import csv from "csv-parser";
import {promises as fsp} from "fs";
import { mkdirSync, existsSync } from "fs";
import fs from "fs";
import { adminPassword, adminUsername } from "../config.mjs";
import { join } from "path";
import { cwd } from "process";
import { generateFilename } from "../Util/fileUpload.mjs";

const backupFolder = join(cwd(), "backup/");
if (!existsSync(backupFolder)) mkdirSync(backupFolder);


export class UserType {
    // Create new instances of the same class as static attributes
    static Applicant = new UserType("applicant")
    static Sage = new UserType("sage")
    static Interviewer = new UserType("interviewer")
    static Admin = new UserType("admin")
  
    constructor(name) {
      this.name = name
    }
}

class User {
    username = "";
    password = "";
    state = "";
    token = "";
    group = "Priviledged users";
    userType;

    /**
     * Generates a new token for this user. Previous token will be invalidated.
     * @returns Newly generated token
     */
    generateToken() {
        this.token = v4();
        return this.token;
    }

    isPrivileged() {
        return this.userType !== UserType.Applicant;
    }

    isAdmin() {
        return this.userType === UserType.Admin;
    }

    isActive() {
        return this.active ?? true;
    }

    isEqual(user) {
        if (!(user instanceof UserType)) return false;
        if (user.userType !== this.userType) return false;
        return user.username === this.username && user.group === this.group;
    }

    constructor(type) {
        if (!(type instanceof UserType)) throw new Error("Invalid parameter type, must be UserType");
        this.userType = type;

        const defaultRoutes = { applicant: "/exam", sage: "/sage", admin: "/admin/session", interviewer: "/interview" }
        this.state = defaultRoutes[type.name] ?? "/error";
    }
}

class Applicant extends User {
    name = "";
    surname = "";
    email = "";
    country = "";
    studyPlan = "";
    active = false;

    constructor() {
        super(UserType.Applicant);
        this.group = "";
    }
}

export function loadCSV(fileName) {
    if (!fs.existsSync(fileName)) throw new Error("File not found");

    const backupPath = join(backupFolder, `backup_${generateFilename()}`);
    saveJSON(backupPath);

    fs.createReadStream(fileName)
        .pipe(csv({
            skipLines: 1,
            separator: ';',
            headers: ["name", "surname", "email", "country", "studyPlan", "date", "time", "username", "password"]
        }))
        .on('data', data => {
            delete data._9;
            delete data._10;

            data.group = `${data.date} ${data.time}`;
            delete data.date;
            delete data.time;

            users.push({ ...(new Applicant()), ...data });
        });

    return users;
}

export async function loadJSON(fileName) {
    if (!fs.existsSync(fileName)) throw new Error("File not found");
    const data = await fsp.readFile(fileName);

    // Make a backup first
    const backupPath = join(backupFolder, `backup_${generateFilename()}`);
    saveJSON(backupPath);

    try {
        const parsedUsers = JSON.parse(data);
        users = [...users, ...parsedUsers];

        return parsedUsers;
    }
    catch {
        return null;
    }
}

export async function saveJSON(fileName) {
    const json = JSON.stringify(users);
    await fsp.writeFile(fileName, json);
}

export function isTokenAdmin(token) {
    const user = users.find(u => u.token === token);
    if (user === undefined) return false;
    else return user.isAdmin(); 
}

export function isTokenPrivileged(token) {
    const user = users.find(u => u.token === token);
    if (user === undefined) return false;
    else return user.isPrivileged();
}

export function findUserByToken(token) {
    return users.find(u => u.token === token);
}

export function editOrAddUser(user) {
    if (!(user instanceof User)) throw new Error("Invalid parameter type, must be User");

    const existingUser = users.find(u => u.isEqual(user));;
    if (existingUser === undefined) users.push(user);
    else Object.assign(existingUser, user);
}

const defaultAdmin = new User(UserType.Admin);
defaultAdmin.username = adminUsername; 
defaultAdmin.password = adminPassword;

const testSage = new User(UserType.Sage);
testSage.username = "sage"; 
testSage.password = "123";

const testApp = new Applicant();
testApp.name = "Petr"; 
testApp.surname = "Vomáčka"; 
testApp.username = "app"; 
testApp.password = "123";
testApp.active = "true";

const testInt = new User(UserType.Interviewer);
testInt.username = "int"; 
testInt.password = "123";

export const users = [ defaultAdmin, testSage, testApp, testInt ];