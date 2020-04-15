import { Event } from "@fp-app/framework-classic"

// tslint:disable:max-classes-per-file

export class CustomerRequestedChanges extends Event {
  constructor(readonly trainTripId: string, readonly itineraryId: string) {
    super()
  }
}
