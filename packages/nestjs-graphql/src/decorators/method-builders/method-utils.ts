import { Args, Context, Info, Mutation, Query, type ReturnTypeFunc } from '@nestjs/graphql';

export interface ArgSpec {
  name: string;
  type: ReturnTypeFunc;
  nullable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyHandler = (this: any, ...callArgs: any[]) => unknown | Promise<unknown>;

export interface DefineMethodOptions {
  target: { prototype: object; name: string };
  methodName: string;
  args: ArgSpec[];
  returnType: ReturnTypeFunc;
  schemaName: string;
  isMutation?: boolean;
  handler: AnyHandler;
  nullable?: boolean;
}

export function defineMethod(opts: DefineMethodOptions): void {
  const { target, methodName, args, returnType, schemaName, isMutation, handler, nullable } = opts;
  const proto = target.prototype as Record<string, unknown>;

  proto[methodName] = function (this: unknown, ...callArgs: unknown[]): unknown {
    return handler.call(this, ...callArgs);
  };

  // Stub "design:paramtypes" to prevent Nest error because of missing this
  const totalParams = args.length + 2;
  const paramTypesStub = Array.from({ length: totalParams }, () => Object);
  Reflect.defineMetadata('design:paramtypes', paramTypesStub, proto, methodName);
  Reflect.defineMetadata('design:returntype', Object, proto, methodName);

  const descriptor = Object.getOwnPropertyDescriptor(proto, methodName)!;

  args.forEach((arg, index) => {
    Args(arg.name, { type: arg.type, nullable: arg.nullable ?? true })(proto, methodName, index);
  });

  const infoIndex = args.length;
  const ctxIndex = args.length + 1;
  Info()(proto, methodName, infoIndex);
  Context()(proto, methodName, ctxIndex);

  const opDecorator = isMutation
    ? Mutation(returnType, { name: schemaName, nullable })
    : Query(returnType, { name: schemaName, nullable });

  opDecorator(proto, methodName, descriptor);

  Object.defineProperty(proto, methodName, descriptor);
}
