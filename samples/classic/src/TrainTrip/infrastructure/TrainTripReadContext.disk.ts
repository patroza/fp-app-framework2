import { ReadContext } from "@fp-app/io.diskdb"
import { TrainTripView } from "../usecases/getTrainTrip"

export default class TrainTripReadContext extends ReadContext<TrainTripView> {
  constructor() {
    super("trainTrip")
  }
}
