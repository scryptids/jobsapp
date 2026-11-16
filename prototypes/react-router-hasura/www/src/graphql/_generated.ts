/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { GraphQLClient, type RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: number | null | undefined;
  _gt?: number | null | undefined;
  _gte?: number | null | undefined;
  _in?: Array<number> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: number | null | undefined;
  _lte?: number | null | undefined;
  _neq?: number | null | undefined;
  _nin?: Array<number> | null | undefined;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: string | null | undefined;
  _gt?: string | null | undefined;
  _gte?: string | null | undefined;
  /** does the column match the given case-insensitive pattern */
  _ilike?: string | null | undefined;
  _in?: Array<string> | null | undefined;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: string | null | undefined;
  _is_null?: boolean | null | undefined;
  /** does the column match the given pattern */
  _like?: string | null | undefined;
  _lt?: string | null | undefined;
  _lte?: string | null | undefined;
  _neq?: string | null | undefined;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: string | null | undefined;
  _nin?: Array<string> | null | undefined;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: string | null | undefined;
  /** does the column NOT match the given pattern */
  _nlike?: string | null | undefined;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: string | null | undefined;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: string | null | undefined;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: string | null | undefined;
  /** does the column match the given SQL regular expression */
  _similar?: string | null | undefined;
};

/** Boolean expression to filter rows from the table "employers". All fields are combined with a logical 'AND'. */
export type Employers_Bool_Exp = {
  _and?: Array<Employers_Bool_Exp> | null | undefined;
  _not?: Employers_Bool_Exp | null | undefined;
  _or?: Array<Employers_Bool_Exp> | null | undefined;
  id?: Int_Comparison_Exp | null | undefined;
  name?: String_Comparison_Exp | null | undefined;
  positions?: Positions_Bool_Exp | null | undefined;
  positions_aggregate?: Positions_Aggregate_Bool_Exp | null | undefined;
  user_id?: Int_Comparison_Exp | null | undefined;
};

/** unique or primary key constraints on table "employers" */
export type Employers_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'employers_pkey';

/** input type for inserting data into table "employers" */
export type Employers_Insert_Input = {
  id?: number | null | undefined;
  name?: string | null | undefined;
  positions?: Positions_Arr_Rel_Insert_Input | null | undefined;
  user_id?: number | null | undefined;
};

/** input type for inserting object relation for remote table "employers" */
export type Employers_Obj_Rel_Insert_Input = {
  data: Employers_Insert_Input;
  /** upsert condition */
  on_conflict?: Employers_On_Conflict | null | undefined;
};

/** on_conflict condition type for table "employers" */
export type Employers_On_Conflict = {
  constraint: Employers_Constraint;
  update_columns?: Array<Employers_Update_Column>;
  where?: Employers_Bool_Exp | null | undefined;
};

/** update columns of table "employers" */
export type Employers_Update_Column =
  /** column name */
  | 'id'
  /** column name */
  | 'name'
  /** column name */
  | 'user_id';

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: unknown;
  _gt?: unknown;
  _gte?: unknown;
  _in?: Array<unknown> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: unknown;
  _lte?: unknown;
  _neq?: unknown;
  _nin?: Array<unknown> | null | undefined;
};

export type Positions_Aggregate_Bool_Exp = {
  count?: Positions_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Positions_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Positions_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Positions_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** input type for inserting array relation for remote table "positions" */
export type Positions_Arr_Rel_Insert_Input = {
  data: Array<Positions_Insert_Input>;
  /** upsert condition */
  on_conflict?: Positions_On_Conflict | null | undefined;
};

/** Boolean expression to filter rows from the table "positions". All fields are combined with a logical 'AND'. */
export type Positions_Bool_Exp = {
  _and?: Array<Positions_Bool_Exp> | null | undefined;
  _not?: Positions_Bool_Exp | null | undefined;
  _or?: Array<Positions_Bool_Exp> | null | undefined;
  employer?: Employers_Bool_Exp | null | undefined;
  employer_id?: Int_Comparison_Exp | null | undefined;
  id?: Int_Comparison_Exp | null | undefined;
  pay_range_lower?: Numeric_Comparison_Exp | null | undefined;
  pay_range_upper?: Numeric_Comparison_Exp | null | undefined;
  posting_url?: String_Comparison_Exp | null | undefined;
  title?: String_Comparison_Exp | null | undefined;
  user_id?: Int_Comparison_Exp | null | undefined;
};

/** unique or primary key constraints on table "positions" */
export type Positions_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'positions_pkey';

/** input type for inserting data into table "positions" */
export type Positions_Insert_Input = {
  employer?: Employers_Obj_Rel_Insert_Input | null | undefined;
  employer_id?: number | null | undefined;
  id?: number | null | undefined;
  pay_range_lower?: unknown;
  pay_range_upper?: unknown;
  posting_url?: string | null | undefined;
  title?: string | null | undefined;
  user_id?: number | null | undefined;
};

/** on_conflict condition type for table "positions" */
export type Positions_On_Conflict = {
  constraint: Positions_Constraint;
  update_columns?: Array<Positions_Update_Column>;
  where?: Positions_Bool_Exp | null | undefined;
};

/** select columns of table "positions" */
export type Positions_Select_Column =
  /** column name */
  | 'employer_id'
  /** column name */
  | 'id'
  /** column name */
  | 'pay_range_lower'
  /** column name */
  | 'pay_range_upper'
  /** column name */
  | 'posting_url'
  /** column name */
  | 'title'
  /** column name */
  | 'user_id';

/** update columns of table "positions" */
export type Positions_Update_Column =
  /** column name */
  | 'employer_id'
  /** column name */
  | 'id'
  /** column name */
  | 'pay_range_lower'
  /** column name */
  | 'pay_range_upper'
  /** column name */
  | 'posting_url'
  /** column name */
  | 'title'
  /** column name */
  | 'user_id';

export type EmployersQueryVariables = Exact<{
  limit?: number;
  user_id: number;
}>;


export type EmployersQuery = { employers: Array<{ id: number, name: string }> };

export type MyEmployersQueryVariables = Exact<{ [key: string]: never; }>;


export type MyEmployersQuery = { employers: Array<{ id: number, name: string }> };

export type EmployerByNameQueryVariables = Exact<{
  name: string;
}>;


export type EmployerByNameQuery = { employers: Array<{ id: number }> };

export type PositionsQueryVariables = Exact<{
  limit?: number;
}>;


export type PositionsQuery = { positions: Array<{ id: number, title: string, employer: { name: string } | null }> };

export type PositionsPageQueryVariables = Exact<{
  limit: number;
  offset: number;
}>;


export type PositionsPageQuery = { positions: Array<{ id: number, title: string, employer: { name: string } | null }> };

export type InsertPositionMutationVariables = Exact<{
  object: Positions_Insert_Input;
}>;


export type InsertPositionMutation = { insert_positions_one: { id: number, title: string } | null };

export type UserByEmailQueryVariables = Exact<{
  email: string;
}>;


export type UserByEmailQuery = { users: Array<{ id: number, password_hash: string | null }> };

export type InsertUserMutationVariables = Exact<{
  email: string;
  passwordHash: string;
}>;


export type InsertUserMutation = { insert_users_one: { id: number } | null };


export const EmployersDocument = gql`
    query employers($limit: Int! = 10, $user_id: Int!) {
  employers(where: {user_id: {_eq: $user_id}}, limit: $limit) {
    id
    name
  }
}
    `;
export const MyEmployersDocument = gql`
    query myEmployers {
  employers(order_by: {name: asc}) {
    id
    name
  }
}
    `;
export const EmployerByNameDocument = gql`
    query employerByName($name: String!) {
  employers(where: {name: {_ilike: $name}}, limit: 1) {
    id
  }
}
    `;
export const PositionsDocument = gql`
    query positions($limit: Int! = 10) {
  positions(limit: $limit) {
    id
    title
    employer {
      name
    }
  }
}
    `;
export const PositionsPageDocument = gql`
    query positionsPage($limit: Int!, $offset: Int!) {
  positions(limit: $limit, offset: $offset, order_by: {id: asc}) {
    id
    title
    employer {
      name
    }
  }
}
    `;
export const InsertPositionDocument = gql`
    mutation insertPosition($object: positions_insert_input!) {
  insert_positions_one(object: $object) {
    id
    title
  }
}
    `;
export const UserByEmailDocument = gql`
    query userByEmail($email: String!) {
  users(where: {email: {_eq: $email}}, limit: 1) {
    id
    password_hash
  }
}
    `;
export const InsertUserDocument = gql`
    mutation insertUser($email: String!, $passwordHash: String!) {
  insert_users_one(object: {email: $email, password_hash: $passwordHash}) {
    id
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    employers(variables: EmployersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<EmployersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EmployersQuery>({ document: EmployersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'employers', 'query', variables);
    },
    myEmployers(variables?: MyEmployersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MyEmployersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MyEmployersQuery>({ document: MyEmployersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'myEmployers', 'query', variables);
    },
    employerByName(variables: EmployerByNameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<EmployerByNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EmployerByNameQuery>({ document: EmployerByNameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'employerByName', 'query', variables);
    },
    positions(variables?: PositionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<PositionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PositionsQuery>({ document: PositionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'positions', 'query', variables);
    },
    positionsPage(variables: PositionsPageQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<PositionsPageQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PositionsPageQuery>({ document: PositionsPageDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'positionsPage', 'query', variables);
    },
    insertPosition(variables: InsertPositionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<InsertPositionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPositionMutation>({ document: InsertPositionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'insertPosition', 'mutation', variables);
    },
    userByEmail(variables: UserByEmailQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserByEmailQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserByEmailQuery>({ document: UserByEmailDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'userByEmail', 'query', variables);
    },
    insertUser(variables: InsertUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<InsertUserMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertUserMutation>({ document: InsertUserDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'insertUser', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;