import { Usuario } from '../../../generated/prisma/client.js';

export type GenericResponse = {
  message: string;
  error: boolean;
};

export interface UserResponse extends GenericResponse {
  message: string;
  user: Usuario[];
  error: boolean;
}

export interface OneUserResponse extends GenericResponse {
  message: string;
  user: Usuario | null;
  error: boolean;
}
