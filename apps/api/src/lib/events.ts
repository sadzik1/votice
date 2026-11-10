import { EventEmitter } from "node:events";

export type ResponseEvent = {
  surveyId: string;
  at: string;
};

// in-memory pub/sub, fine for a single instance
// (would need redis or LISTEN/NOTIFY with more than one)
export class SurveyEvents {
  #emitter = new EventEmitter().setMaxListeners(0);

  publishResponse(surveyId: string): void {
    const event: ResponseEvent = { surveyId, at: new Date().toISOString() };
    this.#emitter.emit(surveyId, event);
  }

  subscribe(surveyId: string, listener: (event: ResponseEvent) => void): () => void {
    this.#emitter.on(surveyId, listener);
    return () => this.#emitter.off(surveyId, listener);
  }
}
