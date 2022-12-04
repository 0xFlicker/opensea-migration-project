import Head from "next/head";
import { DefaultProvider } from "context/default";
import { NextPage } from "next";
import { Home } from "layouts/Home";

const HomePage: NextPage<{}> = () => {
  const title = "NFT Contract Deployer";
  const description = "Handcrafted NFT contract deployer and verifier";
  return (
    <DefaultProvider>
      <Head>
        <title>Contract Deployer</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta property="og:site_name" content="Contract Deployer" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {/* <meta property="og:image" content="https://0xflick.xyz/preview.gif" /> */}
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta content="verification" name="LR1011" />
        {/* <meta
          property="twitter:image"
          content="https://0xflick.xyz/preview.png"
        /> */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@0xflick" />
      </Head>
      <Home />
    </DefaultProvider>
  );
};
export default HomePage;
