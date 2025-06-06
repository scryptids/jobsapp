/**
 * Site header nav
 * @module
 */

import { Link } from "react-router";
import classes from "./Header.module.css";
import { homePath } from "~/app/routes";

interface HeaderProps {
  userId: string | null;
}

export function Header(props: HeaderProps) {
  return (
    <div className={classes["header-nav__container"]}>
      <Link to={homePath}>Home</Link>
      <div>
        {props.userId ? (
          <form method="post" action="/logout">
            <button>Log out user {props.userId}</button>
          </form>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </div>
    </div>
  );
}
