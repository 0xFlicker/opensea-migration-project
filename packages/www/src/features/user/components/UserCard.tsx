import React, {
  Dispatch,
  FC,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { Field, Form, Formik, FormikHelpers, useFormikContext } from "formik";
import useLocalStorage from "use-local-storage";
import { fieldToTextField, TextFieldProps } from "formik-mui";

interface IUserSettings {
  etherscanApiKey: string;
}

export const EtherscanApiInputField: FC<TextFieldProps> = (props) => {
  return <TextField {...fieldToTextField(props)} margin="normal" fullWidth />;
};

export const UserCard: FC = () => {
  const [etherscanApiKey, setEtherscanApiKey] = useLocalStorage(
    "etherscanApiKey",
    ""
  );
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <>
      <Snackbar
        open={open}
        onClose={() => setOpen(false)}
        autoHideDuration={5000}
        message={<Typography>Saved</Typography>}
      />
      <Card>
        <CardHeader title="User" />
        <Formik
          initialValues={{
            etherscanApiKey,
          }}
          onSubmit={async (values, { setSubmitting }) => {
            setEtherscanApiKey(values.etherscanApiKey);
            setSubmitting(false);
            setOpen(true);
            setIsDirty(false);
          }}
        >
          {({ submitForm, setSubmitting, isSubmitting, handleChange }) => (
            <>
              <CardContent>
                <Form>
                  <Field
                    name="etherscanApiKey"
                    label="Etherscan API Key"
                    component={EtherscanApiInputField}
                    type="password"
                    onChange={(e) => {
                      handleChange(e);
                      setIsDirty(true);
                    }}
                  />
                </Form>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={submitForm}
                  disabled={isSubmitting || !isDirty}
                >
                  Save
                </Button>
              </CardActions>
            </>
          )}
        </Formik>
      </Card>
    </>
  );
};
