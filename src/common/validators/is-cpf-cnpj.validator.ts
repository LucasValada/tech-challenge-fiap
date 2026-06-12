import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { cpf, cnpj } from 'cpf-cnpj-validator';

export function IsCpfCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpfCnpj',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const clean = value.replace(/\D/g, '');
          if (clean.length === 11) return cpf.isValid(clean);
          if (clean.length === 14) return cnpj.isValid(clean);
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um CPF ou CNPJ válido`;
        },
      },
    });
  };
}
