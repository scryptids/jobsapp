/**
 * Site header nav
 * @module
 */

import { Link } from "react-router";
import classes from "./Header.module.css";
import { employersListPath, homePath, jobsListPath } from "~/app/routes";

interface HeaderProps {
  readonly userId: string | null;
}

export function Header({ userId }: HeaderProps) {
  return (
    <div className={classes["header-nav__container"]}>
      <nav aria-label="Main" className={classes["header-nav__links"]}>
        <Link to={homePath}>Home</Link>
        {userId ? (
          <>
            <Link to={jobsListPath}>Jobs</Link>
            <Link to={employersListPath}>Employers</Link>
          </>
        ) : null}
      </nav>
      <div>
        {userId ? (
          <form method="post" action="/logout">
            <button type="submit">Log out user {userId}</button>
          </form>
        ) : (
          <>
            <Link to="/login">Log in</Link> <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </div>
  );
}
