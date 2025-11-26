import {
  // ActionFunctionArgs,
  // data,
  // Outlet,
  // redirect,
  useActionData,
  useFetcher,
  // useLinkClickHandler,
  // useLocation,
  // useOutlet,
  // useSubmit,
  // type LoaderFunctionArgs,
} from "react-router";
// import { useLoaderData } from "react-router";
// import { Button } from "@mantine/core";
import {
  ServerFormState,
  ServerValidateError,
  createServerValidate,
  // formOptions,
} from "@tanstack/react-form/remix";

// import { type Positions, type PositionsQuery } from "src/graphql/_generated";
import JobCreationForm from "src/features/jobs/components/JobCreationForm/JobCreationForm";

// import { requireAuthSession, getSessionHasuraToken } from "src/app/sessions";
// import { sdk } from "~/api.server";
import {
  // homePathSegment,
  jobCreationFormPath,
} from "~/app/routes";
import { type Route } from "./+types";
import {
  jobCreationFormOpts,
  JobCreationFormValues,
} from "~/features/jobs/components/JobCreationForm/shared-form";

const serverValidate = createServerValidate({
  ...jobCreationFormOpts,
  onServerValidate: ({ value }) => {
    if (value.title == "") {
      return "Server validation: Title must not be blank";
    }
  },
});

export async function action({ request }: Route.ActionArgs) {
  // const session = await requireAuthSession(request);
  // const hasuraAccessToken = getSessionHasuraToken(session);

  const formData = await request.formData();
  console.log(formData);
  try {
    const validatedData = await serverValidate(formData);
    console.log("validatedData", validatedData);
    console.log("title", validatedData.title);
    // Persist the form data to the database
    // await sql`
    //   INSERT INTO users (name, email, password)
    //   VALUES (${validatedData.name}, ${validatedData.email}, ${validatedData.password})
    // `
  } catch (e) {
    if (e instanceof ServerValidateError) {
      return e.formState as ServerFormState<JobCreationFormValues, undefined>;
    }

    // Some other error occurred while validating your form
    throw e;
  }
  // return redirect(homePathSegment);

  // Form successfully validated
  return null;
}

export type ActionData = ReturnType<typeof useActionData<typeof action>>;

export default function NewJob() {
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();

  return (
    <>
      <JobCreationForm
        actionData={actionData}
        onSubmit={(value) => {
          console.log("onSubmit C");
          fetcher.submit(value, {
            action: jobCreationFormPath,
            method: "post",
          });
        }}
      />
    </>
  );
}
