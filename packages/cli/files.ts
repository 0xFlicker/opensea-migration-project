import fs from "fs";

export async function fileExists(filePath: string) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}
