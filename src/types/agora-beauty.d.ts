// src/types/agora-beauty.d.ts
declare module "agora-extension-beauty-effect" {
  import { IExtension, IProcessor } from "agora-rtc-sdk-ng";

  export default class BeautyExtension implements IExtension<IProcessor> {
    // 원래 있던 것들
    name: string;
    checkCompatibility(): boolean;

    // 타입 정의에서 빠진 것 추가
    createProcessor(): IProcessor;
  }
}
