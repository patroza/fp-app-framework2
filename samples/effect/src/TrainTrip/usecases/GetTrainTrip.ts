import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import * as RC from "../infrastructure/TrainTripReadContext.disk"
import { Do } from "fp-ts-contrib/lib/Do"
import { t, pipe, E, decodeErrors } from "@fp-app/fp-ts-extensions"
import { T } from "@/meffect"
import { ValidationError } from "@fp-app/framework"

const GetTrainTrip = (input: Input) =>
  Do(T.effect)
    .bind("input", T.fromEither(validateInput(input)))
    .bindL("trainTrip", ({ input }) => RC.read(input.trainTripId))
    .return((r) => r.trainTrip)

export default GetTrainTrip

const validateInput = (input: Input) =>
  pipe(
    Input.decode(input),
    E.map((x) => x as Input),
    E.mapLeft((x) => new ValidationError(decodeErrors(x))),
  )

const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
  },
  "GetTrainTripInput",
)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Input extends t.TypeOf<typeof Input> {}

export interface TrainTripView {
  id: string
  createdAt: Date

  allowUserModification: boolean

  pax: Pax
  travelClass: TravelClassDefinition
  travelClasses: { templateId: string; name: TravelClassDefinition }[]
  startDate: Date
}
