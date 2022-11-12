import { IPFSHTTPClient, globSource } from "ipfs-http-client";
import fs from "fs";
import glob from "it-glob";
import { resolve as pathResolve, basename, extname } from "path";

async function countGlobFiles(cwd: string, pattern: string) {
  const fileSizes = new Map<string, number>();
  for await (const fileName of glob(cwd, pattern)) {
    const stat = await fs.promises.stat(fileName);
    fileSizes.set(fileName, stat.size);
  }
  return fileSizes;
}

// Pin a directory of files to IPFS
export async function ipfsPin({
  ipfsClient,
  localFolder,
}: {
  ipfsClient: IPFSHTTPClient;
  localFolder: string;
}) {
  const imageRoot = `/${basename(localFolder)}/images`;
  console.log(`Creating ${imageRoot} on IPFS`);
  await ipfsClient.files.mkdir(imageRoot, {
    parents: true,
  });
  const fileNames = new Map<string, string>();
  for await (const fileSource of globSource(localFolder, "**/!(*.json)")) {
    if (fileSource.content) {
      const imageFileName = fileSource.path;
      fileNames.set(basename(fileSource.path), imageFileName.split("/")[1]);
      // console.log(`Uploading ${imageFileName} to ${imageRoot}${imageFileName}`);
      await ipfsClient.files.write(
        `${imageRoot}${imageFileName}`,
        fileSource.content,
        {
          create: true,
        }
      );
    }
  }

  // Get the CID of the root folder
  const { cid } = await ipfsClient.files.stat(imageRoot);

  // Load each metadata file and update the image path
  const imageIpfsRoot = `ipfs://${cid.toString()}`;
  const metadataRoot = `/${basename(localFolder)}/metadata`;
  await ipfsClient.files.mkdir(metadataRoot, {
    parents: true,
  });
  for await (const file of glob(localFolder, "**/*.json")) {
    // console.log(`Uploading ${file}`);
    const metadata = JSON.parse(
      await fs.promises.readFile(pathResolve(localFolder, file), "utf8")
    );
    const image = fileNames.get(basename(metadata.image));
    if (!image) {
      throw new Error(`Could not find image for ${metadata.image}`);
    }
    metadata.image = `${imageIpfsRoot}/${image}`;

    await ipfsClient.files.write(
      `${metadataRoot}/${basename(file, extname(file))}`,
      JSON.stringify(metadata, null, 2),
      {
        create: true,
      }
    );
  }
  // Get final metadata CID
  const { cid: metadataCid } = await ipfsClient.files.stat(metadataRoot);

  // Print the CIDs
  console.log(`Metadata CID: ${metadataCid.toString()}`);
  console.log(`Images CID: ${cid.toString()}`);
}
