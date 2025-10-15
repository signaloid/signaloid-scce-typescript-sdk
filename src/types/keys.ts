export type KeyDetails = {
  Object: "Key";
  Key: string;
  KeyID: string;
  Name: string;
  Owner: string;
  CreatedAt: number;
  ValidUntil: number;
};

export type KeyRequest = {
  Name: string;
  ValidUntil: number | null;
};

export type ListKeysResponse = {
  UserID: string;
  Keys: KeyDetails[];
  Count: number;
};
