'use strict';

import { copyFile, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const uploadFolder = join(cwd(), "upload/");
if (!existsSync(uploadFolder)) mkdirSync(uploadFolder);

export function generateFilename() {
    return Date.now().toString();
}

export function copyFileToUploads(filePath) {
    return new Promise((resolve, reject) => {
        const target = join(uploadFolder, `upload_${generateFilename()}`);
        copyFile(filePath, target, err => reject(err));

        resolve(target);
    });
}