import { createHash, randomBytes } from "node:crypto";
export function createOpaqueToken(bytes=32){return randomBytes(bytes).toString("hex");}
export function sha256(value:string){return createHash("sha256").update(value).digest("hex");}
