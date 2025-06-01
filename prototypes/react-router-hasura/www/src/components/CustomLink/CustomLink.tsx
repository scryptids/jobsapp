import React from "react";
import {
  // useLinkClickHandler,
  Link,
  type LinkProps,
  // type To
} from "react-router";
// import { Button } from "@mantine/core";
// import { jobCreationFormPath } from "~/app/routes";

// export type CustomLinkProps = Omit<
//   React.AnchorHTMLAttributes<HTMLAnchorElement>,
//   "href"
// > & {
//   to: To;
// };
export type CustomLinkProps = LinkProps;

// stash our attempt to use the Mantine Button here for now
const CustomLink = (props: CustomLinkProps) => {
  // const linkClickHandler = useLinkClickHandler(jobCreationFormPath);
  // const handleJobCreationLinkClick = (
  //   e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  // ) => {
  //   linkClickHandler(e);
  // };
  // return (
  //   <Button component="a" onClick={handleJobCreationLinkClick}>
  //     Add new job
  //   </Button>
  // );

  return <Link {...props} />;
};

CustomLink.displayName = "CustomLink";

export default CustomLink;
