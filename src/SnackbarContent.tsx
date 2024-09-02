import { styled } from "@mui/material/styles";
import clsx from "clsx";
import { HTMLAttributes, forwardRef } from "react";

const componentName = "SnackbarContent";

const classes = {
  root: `${componentName}-root`
};

const Root = styled("div")(({ theme }) => ({
  [`&.${classes.root}`]: {
    display: "flex",
    flexWrap: "wrap",
    flexGrow: 1,
    [theme.breakpoints.up("sm")]: {
      flexGrow: "initial",
      minWidth: 288
    }
  }
}));

const SnackbarContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Root ref={ref} className={clsx(classes.root, className)} {...props} />
));

SnackbarContent.displayName = "SnackbarContent";

export { SnackbarContent };
