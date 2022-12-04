import { FC } from "react";
import TextField from "@mui/material/TextField";
import { fieldToTextField, TextFieldProps } from "formik-mui";
import InputAdornment from "@mui/material/InputAdornment";

export const PercentageInput: FC<TextFieldProps> = (props) => {
  return (
    <TextField
      {...fieldToTextField(props)}
      margin="normal"
      fullWidth
      InputLabelProps={{
        shrink: true,
      }}
      InputProps={{
        endAdornment: <InputAdornment position="end">%</InputAdornment>,
      }}
    />
  );
};
