import Head from "next/head";
import { DefaultProvider } from "context/default";
import { NextPage } from "next";
import { Settings } from "layouts/Settings";

const SettingsPage: NextPage = () => {
  return (
    <DefaultProvider>
      <Head>
        <title>Contract Deployer | Settings</title>
      </Head>
      <Settings />
    </DefaultProvider>
  );
};
export default SettingsPage;
