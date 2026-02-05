declare module 'react-native-vector-icons/Ionicons' {
  import type React from 'react';
  import type { TextProps } from 'react-native';

  export interface IoniconsProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const Ionicons: React.ComponentType<IoniconsProps>;
  export default Ionicons;
}

declare module 'react-native-sqlite-storage' {
  export interface SQLiteResultSetRowList {
    length: number;
    item: (index: number) => any;
  }

  export interface SQLiteResultSet {
    rows: SQLiteResultSetRowList;
  }

  export interface SQLiteDatabaseInstance {
    executeSql: (
      sqlStatement: string,
      params?: any[],
    ) => Promise<[SQLiteResultSet]>;
    close: () => Promise<void>;
  }

  export interface OpenDatabaseParams {
    name: string;
    location?: string;
  }

  export interface SQLiteStatic {
    enablePromise: (enable: boolean) => void;
    openDatabase: (params: OpenDatabaseParams) => Promise<SQLiteDatabaseInstance>;
  }

  const SQLite: SQLiteStatic;

  namespace SQLite {
    export type SQLiteDatabase = SQLiteDatabaseInstance;
    export type ResultSet = SQLiteResultSet;
  }

  export default SQLite;
}

