import { LoaderFunctionArgs } from "react-router";

import { wwwDir } from "~/constants";

export const loader = async (_: LoaderFunctionArgs) => {
  const configFileObject = {
    uuid: "85aaf68e-8fac-4c4c-a6bf-0360180bdcc4",
    root: wwwDir,
  };
  const configFileString = JSON.stringify(configFileObject);
  console.log("config file requested");

  return new Response(configFileString, {
    headers: {
      "Cache-Control": `public, max-age=${60 * 10}, s-maxage=${60 * 60 * 24}`,
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(configFileString)),
    },
  });
};
