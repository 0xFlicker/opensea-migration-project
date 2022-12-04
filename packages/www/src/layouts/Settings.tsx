import MenuList from "@mui/material/MenuList";
import Grid from "@mui/material/Grid";
import { FC } from "react";
import { Main } from "./Main";
import { SiteMenu } from "features/appbar/components/SiteMenu";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { UserCard } from "features/user/components/UserCard";

export const Settings: FC = () => {
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
          <Grid container spacing={2} maxWidth="md">
            <Grid item xs={12} md={12}>
              <UserCard />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Main>
  );
};
