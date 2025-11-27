import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  numeric: { input: any; output: any; }
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

/** ordering argument of a cursor */
export enum Cursor_Ordering {
  /** ascending ordering of the cursor */
  Asc = 'ASC',
  /** descending ordering of the cursor */
  Desc = 'DESC'
}

/** columns and relationships of "employers" */
export type Employers = {
  __typename?: 'employers';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  /** An array relationship */
  positions: Array<Positions>;
  /** An aggregate relationship */
  positions_aggregate: Positions_Aggregate;
  user_id?: Maybe<Scalars['Int']['output']>;
};


/** columns and relationships of "employers" */
export type EmployersPositionsArgs = {
  distinct_on?: InputMaybe<Array<Positions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Positions_Order_By>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};


/** columns and relationships of "employers" */
export type EmployersPositions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Positions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Positions_Order_By>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};

/** aggregated selection of "employers" */
export type Employers_Aggregate = {
  __typename?: 'employers_aggregate';
  aggregate?: Maybe<Employers_Aggregate_Fields>;
  nodes: Array<Employers>;
};

/** aggregate fields of "employers" */
export type Employers_Aggregate_Fields = {
  __typename?: 'employers_aggregate_fields';
  avg?: Maybe<Employers_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Employers_Max_Fields>;
  min?: Maybe<Employers_Min_Fields>;
  stddev?: Maybe<Employers_Stddev_Fields>;
  stddev_pop?: Maybe<Employers_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Employers_Stddev_Samp_Fields>;
  sum?: Maybe<Employers_Sum_Fields>;
  var_pop?: Maybe<Employers_Var_Pop_Fields>;
  var_samp?: Maybe<Employers_Var_Samp_Fields>;
  variance?: Maybe<Employers_Variance_Fields>;
};


/** aggregate fields of "employers" */
export type Employers_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Employers_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Employers_Avg_Fields = {
  __typename?: 'employers_avg_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "employers". All fields are combined with a logical 'AND'. */
export type Employers_Bool_Exp = {
  _and?: InputMaybe<Array<Employers_Bool_Exp>>;
  _not?: InputMaybe<Employers_Bool_Exp>;
  _or?: InputMaybe<Array<Employers_Bool_Exp>>;
  id?: InputMaybe<Int_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  positions?: InputMaybe<Positions_Bool_Exp>;
  positions_aggregate?: InputMaybe<Positions_Aggregate_Bool_Exp>;
  user_id?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "employers" */
export enum Employers_Constraint {
  /** unique or primary key constraint on columns "id" */
  EmployersPkey = 'employers_pkey'
}

/** input type for incrementing numeric columns in table "employers" */
export type Employers_Inc_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "employers" */
export type Employers_Insert_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  positions?: InputMaybe<Positions_Arr_Rel_Insert_Input>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate max on columns */
export type Employers_Max_Fields = {
  __typename?: 'employers_max_fields';
  id?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** aggregate min on columns */
export type Employers_Min_Fields = {
  __typename?: 'employers_min_fields';
  id?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** response of any mutation on the table "employers" */
export type Employers_Mutation_Response = {
  __typename?: 'employers_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Employers>;
};

/** input type for inserting object relation for remote table "employers" */
export type Employers_Obj_Rel_Insert_Input = {
  data: Employers_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Employers_On_Conflict>;
};

/** on_conflict condition type for table "employers" */
export type Employers_On_Conflict = {
  constraint: Employers_Constraint;
  update_columns?: Array<Employers_Update_Column>;
  where?: InputMaybe<Employers_Bool_Exp>;
};

/** Ordering options when selecting data from "employers". */
export type Employers_Order_By = {
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  positions_aggregate?: InputMaybe<Positions_Aggregate_Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: employers */
export type Employers_Pk_Columns_Input = {
  id: Scalars['Int']['input'];
};

/** select columns of table "employers" */
export enum Employers_Select_Column {
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  UserId = 'user_id'
}

/** input type for updating data in table "employers" */
export type Employers_Set_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate stddev on columns */
export type Employers_Stddev_Fields = {
  __typename?: 'employers_stddev_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Employers_Stddev_Pop_Fields = {
  __typename?: 'employers_stddev_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Employers_Stddev_Samp_Fields = {
  __typename?: 'employers_stddev_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "employers" */
export type Employers_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Employers_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Employers_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate sum on columns */
export type Employers_Sum_Fields = {
  __typename?: 'employers_sum_fields';
  id?: Maybe<Scalars['Int']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "employers" */
export enum Employers_Update_Column {
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  UserId = 'user_id'
}

export type Employers_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Employers_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Employers_Set_Input>;
  /** filter the rows which have to be updated */
  where: Employers_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Employers_Var_Pop_Fields = {
  __typename?: 'employers_var_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Employers_Var_Samp_Fields = {
  __typename?: 'employers_var_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Employers_Variance_Fields = {
  __typename?: 'employers_variance_fields';
  id?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** mutation root */
export type Mutation_Root = {
  __typename?: 'mutation_root';
  /** delete data from the table: "employers" */
  delete_employers?: Maybe<Employers_Mutation_Response>;
  /** delete single row from the table: "employers" */
  delete_employers_by_pk?: Maybe<Employers>;
  /** delete data from the table: "positions" */
  delete_positions?: Maybe<Positions_Mutation_Response>;
  /** delete single row from the table: "positions" */
  delete_positions_by_pk?: Maybe<Positions>;
  /** delete data from the table: "users" */
  delete_users?: Maybe<Users_Mutation_Response>;
  /** delete single row from the table: "users" */
  delete_users_by_pk?: Maybe<Users>;
  /** insert data into the table: "employers" */
  insert_employers?: Maybe<Employers_Mutation_Response>;
  /** insert a single row into the table: "employers" */
  insert_employers_one?: Maybe<Employers>;
  /** insert data into the table: "positions" */
  insert_positions?: Maybe<Positions_Mutation_Response>;
  /** insert a single row into the table: "positions" */
  insert_positions_one?: Maybe<Positions>;
  /** insert data into the table: "users" */
  insert_users?: Maybe<Users_Mutation_Response>;
  /** insert a single row into the table: "users" */
  insert_users_one?: Maybe<Users>;
  /** update data of the table: "employers" */
  update_employers?: Maybe<Employers_Mutation_Response>;
  /** update single row of the table: "employers" */
  update_employers_by_pk?: Maybe<Employers>;
  /** update multiples rows of table: "employers" */
  update_employers_many?: Maybe<Array<Maybe<Employers_Mutation_Response>>>;
  /** update data of the table: "positions" */
  update_positions?: Maybe<Positions_Mutation_Response>;
  /** update single row of the table: "positions" */
  update_positions_by_pk?: Maybe<Positions>;
  /** update multiples rows of table: "positions" */
  update_positions_many?: Maybe<Array<Maybe<Positions_Mutation_Response>>>;
  /** update data of the table: "users" */
  update_users?: Maybe<Users_Mutation_Response>;
  /** update single row of the table: "users" */
  update_users_by_pk?: Maybe<Users>;
  /** update multiples rows of table: "users" */
  update_users_many?: Maybe<Array<Maybe<Users_Mutation_Response>>>;
};


/** mutation root */
export type Mutation_RootDelete_EmployersArgs = {
  where: Employers_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Employers_By_PkArgs = {
  id: Scalars['Int']['input'];
};


/** mutation root */
export type Mutation_RootDelete_PositionsArgs = {
  where: Positions_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Positions_By_PkArgs = {
  id: Scalars['Int']['input'];
};


/** mutation root */
export type Mutation_RootDelete_UsersArgs = {
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Users_By_PkArgs = {
  id: Scalars['Int']['input'];
};


/** mutation root */
export type Mutation_RootInsert_EmployersArgs = {
  objects: Array<Employers_Insert_Input>;
  on_conflict?: InputMaybe<Employers_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Employers_OneArgs = {
  object: Employers_Insert_Input;
  on_conflict?: InputMaybe<Employers_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_PositionsArgs = {
  objects: Array<Positions_Insert_Input>;
  on_conflict?: InputMaybe<Positions_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Positions_OneArgs = {
  object: Positions_Insert_Input;
  on_conflict?: InputMaybe<Positions_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_UsersArgs = {
  objects: Array<Users_Insert_Input>;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_OneArgs = {
  object: Users_Insert_Input;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootUpdate_EmployersArgs = {
  _inc?: InputMaybe<Employers_Inc_Input>;
  _set?: InputMaybe<Employers_Set_Input>;
  where: Employers_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Employers_By_PkArgs = {
  _inc?: InputMaybe<Employers_Inc_Input>;
  _set?: InputMaybe<Employers_Set_Input>;
  pk_columns: Employers_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Employers_ManyArgs = {
  updates: Array<Employers_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_PositionsArgs = {
  _inc?: InputMaybe<Positions_Inc_Input>;
  _set?: InputMaybe<Positions_Set_Input>;
  where: Positions_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Positions_By_PkArgs = {
  _inc?: InputMaybe<Positions_Inc_Input>;
  _set?: InputMaybe<Positions_Set_Input>;
  pk_columns: Positions_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Positions_ManyArgs = {
  updates: Array<Positions_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_UsersArgs = {
  _inc?: InputMaybe<Users_Inc_Input>;
  _set?: InputMaybe<Users_Set_Input>;
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Users_By_PkArgs = {
  _inc?: InputMaybe<Users_Inc_Input>;
  _set?: InputMaybe<Users_Set_Input>;
  pk_columns: Users_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Users_ManyArgs = {
  updates: Array<Users_Updates>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['numeric']['input']>;
  _gt?: InputMaybe<Scalars['numeric']['input']>;
  _gte?: InputMaybe<Scalars['numeric']['input']>;
  _in?: InputMaybe<Array<Scalars['numeric']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['numeric']['input']>;
  _lte?: InputMaybe<Scalars['numeric']['input']>;
  _neq?: InputMaybe<Scalars['numeric']['input']>;
  _nin?: InputMaybe<Array<Scalars['numeric']['input']>>;
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = 'asc',
  /** in ascending order, nulls first */
  AscNullsFirst = 'asc_nulls_first',
  /** in ascending order, nulls last */
  AscNullsLast = 'asc_nulls_last',
  /** in descending order, nulls first */
  Desc = 'desc',
  /** in descending order, nulls first */
  DescNullsFirst = 'desc_nulls_first',
  /** in descending order, nulls last */
  DescNullsLast = 'desc_nulls_last'
}

/** columns and relationships of "positions" */
export type Positions = {
  __typename?: 'positions';
  /** An object relationship */
  employer?: Maybe<Employers>;
  employer_id?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  pay_range_lower?: Maybe<Scalars['numeric']['output']>;
  pay_range_upper?: Maybe<Scalars['numeric']['output']>;
  posting_url?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** aggregated selection of "positions" */
export type Positions_Aggregate = {
  __typename?: 'positions_aggregate';
  aggregate?: Maybe<Positions_Aggregate_Fields>;
  nodes: Array<Positions>;
};

export type Positions_Aggregate_Bool_Exp = {
  count?: InputMaybe<Positions_Aggregate_Bool_Exp_Count>;
};

export type Positions_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Positions_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Positions_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "positions" */
export type Positions_Aggregate_Fields = {
  __typename?: 'positions_aggregate_fields';
  avg?: Maybe<Positions_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Positions_Max_Fields>;
  min?: Maybe<Positions_Min_Fields>;
  stddev?: Maybe<Positions_Stddev_Fields>;
  stddev_pop?: Maybe<Positions_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Positions_Stddev_Samp_Fields>;
  sum?: Maybe<Positions_Sum_Fields>;
  var_pop?: Maybe<Positions_Var_Pop_Fields>;
  var_samp?: Maybe<Positions_Var_Samp_Fields>;
  variance?: Maybe<Positions_Variance_Fields>;
};


/** aggregate fields of "positions" */
export type Positions_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Positions_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "positions" */
export type Positions_Aggregate_Order_By = {
  avg?: InputMaybe<Positions_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Positions_Max_Order_By>;
  min?: InputMaybe<Positions_Min_Order_By>;
  stddev?: InputMaybe<Positions_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Positions_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Positions_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Positions_Sum_Order_By>;
  var_pop?: InputMaybe<Positions_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Positions_Var_Samp_Order_By>;
  variance?: InputMaybe<Positions_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "positions" */
export type Positions_Arr_Rel_Insert_Input = {
  data: Array<Positions_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Positions_On_Conflict>;
};

/** aggregate avg on columns */
export type Positions_Avg_Fields = {
  __typename?: 'positions_avg_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by avg() on columns of table "positions" */
export type Positions_Avg_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "positions". All fields are combined with a logical 'AND'. */
export type Positions_Bool_Exp = {
  _and?: InputMaybe<Array<Positions_Bool_Exp>>;
  _not?: InputMaybe<Positions_Bool_Exp>;
  _or?: InputMaybe<Array<Positions_Bool_Exp>>;
  employer?: InputMaybe<Employers_Bool_Exp>;
  employer_id?: InputMaybe<Int_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
  pay_range_lower?: InputMaybe<Numeric_Comparison_Exp>;
  pay_range_upper?: InputMaybe<Numeric_Comparison_Exp>;
  posting_url?: InputMaybe<String_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  user_id?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "positions" */
export enum Positions_Constraint {
  /** unique or primary key constraint on columns "id" */
  PositionsPkey = 'positions_pkey'
}

/** input type for incrementing numeric columns in table "positions" */
export type Positions_Inc_Input = {
  employer_id?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  pay_range_lower?: InputMaybe<Scalars['numeric']['input']>;
  pay_range_upper?: InputMaybe<Scalars['numeric']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "positions" */
export type Positions_Insert_Input = {
  employer?: InputMaybe<Employers_Obj_Rel_Insert_Input>;
  employer_id?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  pay_range_lower?: InputMaybe<Scalars['numeric']['input']>;
  pay_range_upper?: InputMaybe<Scalars['numeric']['input']>;
  posting_url?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate max on columns */
export type Positions_Max_Fields = {
  __typename?: 'positions_max_fields';
  employer_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  pay_range_lower?: Maybe<Scalars['numeric']['output']>;
  pay_range_upper?: Maybe<Scalars['numeric']['output']>;
  posting_url?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** order by max() on columns of table "positions" */
export type Positions_Max_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  posting_url?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Positions_Min_Fields = {
  __typename?: 'positions_min_fields';
  employer_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  pay_range_lower?: Maybe<Scalars['numeric']['output']>;
  pay_range_upper?: Maybe<Scalars['numeric']['output']>;
  posting_url?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** order by min() on columns of table "positions" */
export type Positions_Min_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  posting_url?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "positions" */
export type Positions_Mutation_Response = {
  __typename?: 'positions_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Positions>;
};

/** on_conflict condition type for table "positions" */
export type Positions_On_Conflict = {
  constraint: Positions_Constraint;
  update_columns?: Array<Positions_Update_Column>;
  where?: InputMaybe<Positions_Bool_Exp>;
};

/** Ordering options when selecting data from "positions". */
export type Positions_Order_By = {
  employer?: InputMaybe<Employers_Order_By>;
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  posting_url?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: positions */
export type Positions_Pk_Columns_Input = {
  id: Scalars['Int']['input'];
};

/** select columns of table "positions" */
export enum Positions_Select_Column {
  /** column name */
  EmployerId = 'employer_id',
  /** column name */
  Id = 'id',
  /** column name */
  PayRangeLower = 'pay_range_lower',
  /** column name */
  PayRangeUpper = 'pay_range_upper',
  /** column name */
  PostingUrl = 'posting_url',
  /** column name */
  Title = 'title',
  /** column name */
  UserId = 'user_id'
}

/** input type for updating data in table "positions" */
export type Positions_Set_Input = {
  employer_id?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  pay_range_lower?: InputMaybe<Scalars['numeric']['input']>;
  pay_range_upper?: InputMaybe<Scalars['numeric']['input']>;
  posting_url?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate stddev on columns */
export type Positions_Stddev_Fields = {
  __typename?: 'positions_stddev_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev() on columns of table "positions" */
export type Positions_Stddev_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Positions_Stddev_Pop_Fields = {
  __typename?: 'positions_stddev_pop_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_pop() on columns of table "positions" */
export type Positions_Stddev_Pop_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Positions_Stddev_Samp_Fields = {
  __typename?: 'positions_stddev_samp_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_samp() on columns of table "positions" */
export type Positions_Stddev_Samp_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "positions" */
export type Positions_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Positions_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Positions_Stream_Cursor_Value_Input = {
  employer_id?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  pay_range_lower?: InputMaybe<Scalars['numeric']['input']>;
  pay_range_upper?: InputMaybe<Scalars['numeric']['input']>;
  posting_url?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate sum on columns */
export type Positions_Sum_Fields = {
  __typename?: 'positions_sum_fields';
  employer_id?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  pay_range_lower?: Maybe<Scalars['numeric']['output']>;
  pay_range_upper?: Maybe<Scalars['numeric']['output']>;
  user_id?: Maybe<Scalars['Int']['output']>;
};

/** order by sum() on columns of table "positions" */
export type Positions_Sum_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** update columns of table "positions" */
export enum Positions_Update_Column {
  /** column name */
  EmployerId = 'employer_id',
  /** column name */
  Id = 'id',
  /** column name */
  PayRangeLower = 'pay_range_lower',
  /** column name */
  PayRangeUpper = 'pay_range_upper',
  /** column name */
  PostingUrl = 'posting_url',
  /** column name */
  Title = 'title',
  /** column name */
  UserId = 'user_id'
}

export type Positions_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Positions_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Positions_Set_Input>;
  /** filter the rows which have to be updated */
  where: Positions_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Positions_Var_Pop_Fields = {
  __typename?: 'positions_var_pop_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by var_pop() on columns of table "positions" */
export type Positions_Var_Pop_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Positions_Var_Samp_Fields = {
  __typename?: 'positions_var_samp_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by var_samp() on columns of table "positions" */
export type Positions_Var_Samp_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Positions_Variance_Fields = {
  __typename?: 'positions_variance_fields';
  employer_id?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  pay_range_lower?: Maybe<Scalars['Float']['output']>;
  pay_range_upper?: Maybe<Scalars['Float']['output']>;
  user_id?: Maybe<Scalars['Float']['output']>;
};

/** order by variance() on columns of table "positions" */
export type Positions_Variance_Order_By = {
  employer_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  pay_range_lower?: InputMaybe<Order_By>;
  pay_range_upper?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

export type Query_Root = {
  __typename?: 'query_root';
  /** fetch data from the table: "employers" */
  employers: Array<Employers>;
  /** fetch aggregated fields from the table: "employers" */
  employers_aggregate: Employers_Aggregate;
  /** fetch data from the table: "employers" using primary key columns */
  employers_by_pk?: Maybe<Employers>;
  /** An array relationship */
  positions: Array<Positions>;
  /** An aggregate relationship */
  positions_aggregate: Positions_Aggregate;
  /** fetch data from the table: "positions" using primary key columns */
  positions_by_pk?: Maybe<Positions>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
};


export type Query_RootEmployersArgs = {
  distinct_on?: InputMaybe<Array<Employers_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Employers_Order_By>>;
  where?: InputMaybe<Employers_Bool_Exp>;
};


export type Query_RootEmployers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Employers_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Employers_Order_By>>;
  where?: InputMaybe<Employers_Bool_Exp>;
};


export type Query_RootEmployers_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Query_RootPositionsArgs = {
  distinct_on?: InputMaybe<Array<Positions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Positions_Order_By>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};


export type Query_RootPositions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Positions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Positions_Order_By>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};


export type Query_RootPositions_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Query_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Query_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Query_RootUsers_By_PkArgs = {
  id: Scalars['Int']['input'];
};

export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** fetch data from the table: "employers" */
  employers: Array<Employers>;
  /** fetch aggregated fields from the table: "employers" */
  employers_aggregate: Employers_Aggregate;
  /** fetch data from the table: "employers" using primary key columns */
  employers_by_pk?: Maybe<Employers>;
  /** fetch data from the table in a streaming manner: "employers" */
  employers_stream: Array<Employers>;
  /** An array relationship */
  positions: Array<Positions>;
  /** An aggregate relationship */
  positions_aggregate: Positions_Aggregate;
  /** fetch data from the table: "positions" using primary key columns */
  positions_by_pk?: Maybe<Positions>;
  /** fetch data from the table in a streaming manner: "positions" */
  positions_stream: Array<Positions>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
  /** fetch data from the table in a streaming manner: "users" */
  users_stream: Array<Users>;
};


export type Subscription_RootEmployersArgs = {
  distinct_on?: InputMaybe<Array<Employers_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Employers_Order_By>>;
  where?: InputMaybe<Employers_Bool_Exp>;
};


export type Subscription_RootEmployers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Employers_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Employers_Order_By>>;
  where?: InputMaybe<Employers_Bool_Exp>;
};


export type Subscription_RootEmployers_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Subscription_RootEmployers_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Employers_Stream_Cursor_Input>>;
  where?: InputMaybe<Employers_Bool_Exp>;
};


export type Subscription_RootPositionsArgs = {
  distinct_on?: InputMaybe<Array<Positions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Positions_Order_By>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};


export type Subscription_RootPositions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Positions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Positions_Order_By>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};


export type Subscription_RootPositions_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Subscription_RootPositions_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Positions_Stream_Cursor_Input>>;
  where?: InputMaybe<Positions_Bool_Exp>;
};


export type Subscription_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Subscription_RootUsers_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Users_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_Bool_Exp>;
};

/** columns and relationships of "users" */
export type Users = {
  __typename?: 'users';
  id: Scalars['Int']['output'];
};

/** aggregated selection of "users" */
export type Users_Aggregate = {
  __typename?: 'users_aggregate';
  aggregate?: Maybe<Users_Aggregate_Fields>;
  nodes: Array<Users>;
};

/** aggregate fields of "users" */
export type Users_Aggregate_Fields = {
  __typename?: 'users_aggregate_fields';
  avg?: Maybe<Users_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Users_Max_Fields>;
  min?: Maybe<Users_Min_Fields>;
  stddev?: Maybe<Users_Stddev_Fields>;
  stddev_pop?: Maybe<Users_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Users_Stddev_Samp_Fields>;
  sum?: Maybe<Users_Sum_Fields>;
  var_pop?: Maybe<Users_Var_Pop_Fields>;
  var_samp?: Maybe<Users_Var_Samp_Fields>;
  variance?: Maybe<Users_Variance_Fields>;
};


/** aggregate fields of "users" */
export type Users_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Users_Avg_Fields = {
  __typename?: 'users_avg_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
export type Users_Bool_Exp = {
  _and?: InputMaybe<Array<Users_Bool_Exp>>;
  _not?: InputMaybe<Users_Bool_Exp>;
  _or?: InputMaybe<Array<Users_Bool_Exp>>;
  id?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "users" */
export enum Users_Constraint {
  /** unique or primary key constraint on columns "id" */
  UsersPkey = 'users_pkey'
}

/** input type for incrementing numeric columns in table "users" */
export type Users_Inc_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "users" */
export type Users_Insert_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate max on columns */
export type Users_Max_Fields = {
  __typename?: 'users_max_fields';
  id?: Maybe<Scalars['Int']['output']>;
};

/** aggregate min on columns */
export type Users_Min_Fields = {
  __typename?: 'users_min_fields';
  id?: Maybe<Scalars['Int']['output']>;
};

/** response of any mutation on the table "users" */
export type Users_Mutation_Response = {
  __typename?: 'users_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Users>;
};

/** on_conflict condition type for table "users" */
export type Users_On_Conflict = {
  constraint: Users_Constraint;
  update_columns?: Array<Users_Update_Column>;
  where?: InputMaybe<Users_Bool_Exp>;
};

/** Ordering options when selecting data from "users". */
export type Users_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: users */
export type Users_Pk_Columns_Input = {
  id: Scalars['Int']['input'];
};

/** select columns of table "users" */
export enum Users_Select_Column {
  /** column name */
  Id = 'id'
}

/** input type for updating data in table "users" */
export type Users_Set_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate stddev on columns */
export type Users_Stddev_Fields = {
  __typename?: 'users_stddev_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Users_Stddev_Pop_Fields = {
  __typename?: 'users_stddev_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Users_Stddev_Samp_Fields = {
  __typename?: 'users_stddev_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "users" */
export type Users_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate sum on columns */
export type Users_Sum_Fields = {
  __typename?: 'users_sum_fields';
  id?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "users" */
export enum Users_Update_Column {
  /** column name */
  Id = 'id'
}

export type Users_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Users_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Users_Set_Input>;
  /** filter the rows which have to be updated */
  where: Users_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Users_Var_Pop_Fields = {
  __typename?: 'users_var_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Users_Var_Samp_Fields = {
  __typename?: 'users_var_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Users_Variance_Fields = {
  __typename?: 'users_variance_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

export type EmployersQueryVariables = Exact<{
  limit?: Scalars['Int']['input'];
  user_id: Scalars['Int']['input'];
}>;


export type EmployersQuery = { __typename?: 'query_root', employers: Array<{ __typename?: 'employers', id: number, name: string }> };

export type PositionsQueryVariables = Exact<{
  limit?: Scalars['Int']['input'];
}>;


export type PositionsQuery = { __typename?: 'query_root', positions: Array<{ __typename?: 'positions', id: number, title: string, employer?: { __typename?: 'employers', name: string } | null }> };


export const EmployersDocument = gql`
    query employers($limit: Int! = 10, $user_id: Int!) {
  employers(where: {user_id: {_eq: $user_id}}, limit: $limit) {
    id
    name
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    employers(variables: EmployersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<EmployersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EmployersQuery>({ document: EmployersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'employers', 'query', variables);
    },
    positions(variables?: PositionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<PositionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PositionsQuery>({ document: PositionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'positions', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;