import MenuList from "@mui/material/MenuList";
import Grid from "@mui/material/Grid";
import { FC } from "react";
import { Main } from "./Main";
import { SiteMenu } from "features/appbar/components/SiteMenu";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { StacysCollabDeployCard } from "features/deploy/components/StacysCollabDeployCard";
import { HunnysOGSDeployCard } from "features/deploy/components/HunnysOGSDeployCard";
import { StacysDeployCard } from "features/deploy/components/StacysDeployCard";
import { GoldenTicketDeployCard } from "features/deploy/components/GoldenTicket";
import { GoldenTicketRedeemedCard } from "features/deploy/components/GoldenTIcketRedeemedCard";

export const Home: FC = () => {
  return (
    <Main
      title="NFT Contract Deployer"
      menu={
        <>
          <MenuList dense disablePadding>
            <SiteMenu />
          </MenuList>
        </>
      }
    >
      <Container
        maxWidth={false}
        sx={{
          mt: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            alignContent: "center",
          }}
        >
          <Grid container spacing={2} maxWidth="xl">
            <Grid item xs={12} md={12} lg={6} xl={6}>
              <StacysDeployCard />
            </Grid>
            <Grid item xs={12} md={12} lg={6} xl={6}>
              <StacysCollabDeployCard />
            </Grid>
            <Grid item xs={12} md={12} lg={6} xl={6}>
              <HunnysOGSDeployCard />
            </Grid>
            <Grid item xs={12} md={12} lg={6} xl={6}>
              <GoldenTicketDeployCard />
            </Grid>
            <Grid item xs={12} md={12} lg={6} xl={6}>
              <GoldenTicketRedeemedCard />
            </Grid>
            <Grid item xs={12} md={12} lg={12} xl={12}>
              <Box paddingTop={4} />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Main>
  );
};
