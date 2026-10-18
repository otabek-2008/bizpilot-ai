// espeak-ng paketi tur e'lonlarisiz keladi (Emscripten moduli).
declare module "espeak-ng" {
  const ESpeakNg: (module: Record<string, unknown>) => Promise<unknown>;
  export default ESpeakNg;
}
