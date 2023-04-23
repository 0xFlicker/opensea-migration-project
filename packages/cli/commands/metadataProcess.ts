import fs from "fs";
import { basename, join, resolve as pathResolve } from "path";
import { Canvas, createCanvas, loadImage, Image } from "canvas";
import { IMetadata } from "../metadata";
import { BigNumber } from "ethers";
import { parse } from "csv-parse/sync";
import cliProgress from "cli-progress";
import { mergeMap, Subject } from "rxjs";

async function generateWrappedImage({
  srcCanvas,
  outputImagePath,
  unwrappedImage,
}: {
  srcCanvas: Canvas;
  outputImagePath: string;
  unwrappedImage: Image;
}) {
  const ctx = srcCanvas.getContext("2d");
  // Draw overlay over the entire image
  ctx.drawImage(unwrappedImage, 0, 0, srcCanvas.width, srcCanvas.height);
  return new Promise<void>((resolve, reject) =>
    srcCanvas.toBuffer(
      (err, buf) => {
        if (err) return reject(err);
        fs.writeFile(outputImagePath, buf, (err) => {
          if (err) return reject(err);
          resolve();
        });
      },
      "image/png",
      { compressionLevel: 9 }
    )
  );
}

async function generateFireImage({
  srcCanvas,
  outputImagePath,
  fireImage,
}: {
  srcCanvas: Canvas;
  outputImagePath: string;
  fireImage: Image;
}) {
  const ctx = srcCanvas.getContext("2d");
  // Draw fire at the bottom of the image, scaled to the width of the image
  const scaleFactor = srcCanvas.width / fireImage.width;
  const fireOffset = 50;
  ctx.drawImage(
    fireImage,
    0,
    srcCanvas.height - fireImage.height * scaleFactor + fireOffset,
    srcCanvas.width,
    fireImage.height * scaleFactor + fireOffset
  );
  return new Promise<void>((resolve, reject) =>
    srcCanvas.toBuffer(
      (err, buf) => {
        if (err) return reject(err);
        fs.writeFile(outputImagePath, buf, (err) => {
          if (err) return reject(err);
          resolve();
        });
      },
      "image/png",
      { compressionLevel: 9 }
    )
  );
}

async function generateFlippedImage({
  inputFilePath,
  outputFilePath,
}: {
  inputFilePath: string;
  outputFilePath: string;
}): Promise<Canvas> {
  const srcImage = await loadImage(inputFilePath);
  const srcCanvas = createCanvas(srcImage.width, srcImage.height);
  const ctx = srcCanvas.getContext("2d");
  // Draw the image flipped horizontally
  ctx.translate(srcImage.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(srcImage, 0, 0);
  await fs.promises.writeFile(
    outputFilePath,
    srcCanvas.toBuffer("image/png", { compressionLevel: 9 })
  );
  return srcCanvas;
}

export async function generateBurnableMetadata({
  inDir,
  outDir,
}: {
  inDir: string;
  outDir: string;
}) {
  const progress = new cliProgress.SingleBar(
    {
      format: "Processing metadata [{bar}] {percentage}% | ETA: {eta}s",
    },
    cliProgress.Presets.shades_classic
  );
  const unwrappedImage = await loadImage("./wrapped.png");
  const rankingRows = parse(
    fs.readFileSync("./fls_ranks.csv")
  ).flat() as string[];
  // Turn into a map of tokeId to rank
  const rankingMap = new Map(
    rankingRows.map((row, index) => {
      const rank = index + 1;
      return [Number(row), rank];
    })
  );

  await fs.promises.mkdir(pathResolve(outDir, "assets"), { recursive: true });
  await fs.promises.mkdir(pathResolve(outDir, "metadata"), { recursive: true });
  await fs.promises.mkdir(pathResolve(outDir, "burned", "assets"), {
    recursive: true,
  });
  await fs.promises.mkdir(pathResolve(outDir, "burned", "metadata"), {
    recursive: true,
  });
  // Iterate over all JSON files in a directory.
  const filesToParse: string[] = [];
  const subject = new Subject<{
    metadata: IMetadata;
    i: number;
  }>();
  const observable = subject.pipe(
    mergeMap(async ({ metadata, i }) => {
      const imageFilePath = pathResolve(
        inDir,
        "assets",
        basename(metadata.image)
      );
      const outImageFilePath = pathResolve(
        outDir,
        "assets",
        basename(metadata.image)
      );
      const burnedImageFilePath = pathResolve(
        outDir,
        "burned",
        "assets",
        basename(metadata.image)
      );

      const srcImage = await loadImage(imageFilePath);
      const srcCanvas = createCanvas(srcImage.width, srcImage.height);
      const ctx = srcCanvas.getContext("2d");
      ctx.drawImage(srcImage, 0, 0, srcCanvas.width, srcCanvas.height);
      await generateWrappedImage({
        unwrappedImage,
        srcCanvas: srcCanvas,
        outputImagePath: burnedImageFilePath,
      });
      const newBurnedMetadata: IMetadata = {
        ...metadata,
        attributes: [
          ...(metadata.attributes ?? []),
          {
            trait_type: "Unwrapped",
            value: "true",
          },
          {
            trait_type: "OG Rank",
            value: rankingMap.get(i + 1)!,
          },
        ],
        image: `burned/${basename(metadata.image)}`,
      };
      const newMetadata = {
        ...metadata,
        attributes: [
          ...(metadata.attributes ?? []),
          {
            trait_type: "Wrapped",
            value: "true",
          },
          {
            trait_type: "OG Rank",
            value: rankingMap.get(i + 1)!,
          },
        ],
        image: basename(metadata.image),
      };
      await fs.promises.writeFile(
        pathResolve(outDir, "metadata", `${i}.json`),
        JSON.stringify(newMetadata, null, 2)
      );
      await fs.promises.writeFile(
        pathResolve(outDir, "burned", "metadata", `${i}.json`),
        JSON.stringify(newBurnedMetadata, null, 2)
      );
      // Copy all original assets to the output directory
      await fs.promises.copyFile(imageFilePath, outImageFilePath);

      progress.increment();
    }, 10)
  );
  for await (const dirEntry of await fs.promises.opendir(inDir)) {
    if (dirEntry.isFile() && dirEntry.name.endsWith(".json")) {
      filesToParse.push(dirEntry.name);
    }
  }
  const metadataJson: IMetadata[] = [];
  for (const file of filesToParse.sort((a, b) =>
    BigNumber.from(basename(a, ".json"))
      .sub(BigNumber.from(basename(b, ".json")))
      .toNumber()
  )) {
    const metadata = JSON.parse(
      await fs.promises.readFile(`${inDir}/${file}`, "utf8")
    );
    metadataJson.push(metadata);
  }
  const done = new Promise((resolve, reject) => {
    observable.subscribe({
      complete: () => {
        progress.stop();
        console.log("Done!");
        resolve(null);
      },
      error: (err) => {
        console.error(err);
        reject(err);
      },
    });
  });
  progress.start(metadataJson.length, 0);
  for (let i = 0; i < metadataJson.length; i++) {
    subject.next({
      metadata: metadataJson[i],
      i,
    });
  }
  subject.complete();
  await done;
}
