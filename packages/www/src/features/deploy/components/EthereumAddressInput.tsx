import { FC } from "react";
import TextField from "@mui/material/TextField";
import { fieldToTextField, TextFieldProps } from "formik-mui";
import InputAdornment from "@mui/material/InputAdornment";
import Image from "next/image";
import { useAppSelector } from "app/store";
import { selectors as appbarSelectors } from "features/appbar/redux";

export const EthereumAddressInput: FC<TextFieldProps> = (props) => {
  const isDarkMode = useAppSelector(appbarSelectors.darkMode);
  return (
    <TextField
      {...fieldToTextField(props)}
      margin="normal"
      fullWidth
      InputProps={{
        ...props.InputProps,
        startAdornment: (
          <InputAdornment position="start">
            <Image
              src={`/icons/ethereum-${isDarkMode ? "dark" : "light"}.svg`}
              alt=""
              width={32}
              height={32}
            />
          </InputAdornment>
        ),
      }}
    />
  );
};
