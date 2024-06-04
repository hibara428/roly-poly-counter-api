// App
export type Bindings = {
  DB: D1Database;
};
export type Env = {
  Bindings: Bindings;
};
// Requests
export type UserAddRequest = {
  email: string;
};
export type DailyRolyPolyCountUpRequest = {
  direction: 'east' | 'west' | 'south' | 'north';
  year: number;
  month: number;
  day: number;
};
export type DailyOthersCountUpRequest = {
  object: 'dog' | 'cat' | 'butterfly';
  year: number;
  month: number;
  day: number;
};
// DB table definitions
export type User = {
  id: number;
  email: string;
};
export type ExistsRecord = {
  exists_record: number;
};
export type DailyRolyPolyDirectionCounts = {
  id: number;
  user_id: number;
  date: string;
  east: number;
  west: number;
  south: number;
  north: number;
};
export type DailyOthersCounts = {
  id: number;
  user_id: number;
  date: string;
  dog: number;
  cat: number;
  butterfly: number;
};
