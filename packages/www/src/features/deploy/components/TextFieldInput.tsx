import TextField from "@mui/material/TextField";
import { TextFieldProps, fieldToTextField } from "formik-mui";
import { FC } from "react";

export const TextFieldInput: FC<TextFieldProps> = (props) => {
  return <TextField {...fieldToTextField(props)} margin="normal" fullWidth />;
};
