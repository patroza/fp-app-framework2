import TrainTrip, { TravelClassConfiguration, Price } from "@e/TrainTrip/TrainTrip"
import { TrainTripContext as TrainTripContextType } from "@e/TrainTrip/usecases/types"
import { RecordNotFound } from "@fp-app/framework"
import * as diskdb from "@fp-app/io.diskdb"
import TravelClassDefinition from "../TravelClassDefinition"
import { TravelClass } from "../Trip"
import { TrainTripView } from "../usecases/GetTrainTrip"
import TrainTripReadContext from "./TrainTripReadContext.disk"
import PaxDefinition, { Pax } from "../PaxDefinition"
import { T, Free, O } from "@e/meffect"
import { pipe } from "fp-ts/lib/pipeable"

// Since we assume that saving a valid object, means restoring a valid object
// we can assume data correctness and can skip normal validation and constructing.
// until proven otherwise.
type D = {
  readContext: TrainTripReadContext
  trainTrips: ReturnType<typeof trainTrips>
}
const DiskDBContext = function TrainTripContext({ readContext, trainTrips }: D) {
  let disposed = false
  const save = () =>
    trainTrips.intSave(
      (i) => readContext.create(i.id, TrainTripToView(i)),
      (i) => readContext.delete(i.id),
    )
  const dispose = () => (disposed = true)
  return {
    save: () => {
      if (disposed) {
        throw new Error("The context is already disposed")
      }
      return save()
    },
    trainTrips,
    dispose,
  } as TrainTripContextType
}

export function trainTrips() {
  return new diskdb.DiskRecordContext<TrainTrip>(
    "trainTrip",
    serializeTrainTrip,
    deserializeDbTrainTrip,
  )
}

const TrainTripContextURI = "@fp-app/effect/traintrip-context"
const TrainTripContext_ = Free.define({
  [TrainTripContextURI]: {
    add: Free.fn<(tt: TrainTrip) => T.Sync<void>>(),
    load: Free.fn<(id: string) => T.Async<O.Option<TrainTrip>>>(),
    remove: Free.fn<(tt: TrainTrip) => T.Sync<void>>(),
    save: Free.fn<() => T.Async<void>>(),
    registerChanged: Free.fn<(tt: TrainTrip) => T.Sync<void>>(),
  },
})
export interface TrainTripContext extends Free.TypeOf<typeof TrainTripContext_> {}

export const TrainTripContext = Free.opaque<TrainTripContext>()(TrainTripContext_)

export const { add, load, registerChanged, remove, save } = Free.access(
  TrainTripContext,
)[TrainTripContextURI]

export const loadE = (id: string) =>
  pipe(
    load(id),
    T.chain(
      O.fold(
        () =>
          T.raiseError<RecordNotFound, TrainTrip>(new RecordNotFound("trainTrip", id)),
        T.pure,
      ),
    ),
  )

export const contextEnv = "@fp-app/effect/traintrip-context/ctx"

export interface TTCContext {
  [contextEnv]: {
    ctx: TrainTripContextType
  }
}

export const provideTrainTripContext = Free.implement(TrainTripContext)({
  [TrainTripContextURI]: {
    add: (tt: TrainTrip) =>
      T.accessM((r: TTCContext) => T.sync(() => r[contextEnv].ctx.trainTrips.add(tt))),
    load: (id: string) =>
      T.accessM((r: TTCContext) => T.encaseTask(r[contextEnv].ctx.trainTrips.load(id))),
    remove: (tt: TrainTrip) =>
      T.accessM((r: TTCContext) =>
        T.sync(() => r[contextEnv].ctx.trainTrips.remove(tt)),
      ),
    save: () => T.accessM((r: TTCContext) => T.encaseTask(r[contextEnv].ctx.save)),
    registerChanged: (tt: TrainTrip) =>
      T.accessM((r: TTCContext) =>
        T.sync(() => r[contextEnv].ctx.trainTrips.registerChanged(tt)),
      ),
  },
})

export default DiskDBContext

const TrainTripToView = (trip: TrainTrip): TrainTripView => {
  const {
    createdAt,
    currentTravelClassConfiguration,
    id,
    pax,
    startDate,
    travelClassConfiguration,
  } = trip
  return {
    id,

    allowUserModification: !TrainTrip.isLocked(trip),
    createdAt,

    pax,
    startDate,
    travelClass: currentTravelClassConfiguration.travelClass.name,
    travelClasses: travelClassConfiguration.map(
      ({ travelClass: { name, templateId } }) => ({ templateId, name }),
    ),
  }
}

const serializeTrainTrip = (tt: TrainTrip) => diskdb.stringify(tt)

function deserializeDbTrainTrip(serializedTrainTrip: string) {
  const {
    createdAt,
    currentTravelClassConfiguration,
    id,
    lockedAt,
    opportunityId,
    pax,
    startDate,
    travelClassConfiguration,
  } = diskdb.parse<TrainTripDTO>(serializedTrainTrip)
  // what do we do? we restore all properties that are just property bags
  // and we recreate proper object graph for properties that have behaviors
  // TODO: use type information or configuration, probably a library ;-)

  const travelClassConfigurations = travelClassConfiguration.map(
    mapTravelClassConfigurationDTO,
  )
  const trainTrip: TrainTrip = {
    id,
    pax: pax as PaxDefinition,
    startDate: new Date(startDate),
    travelClassConfiguration: travelClassConfigurations,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    currentTravelClassConfiguration: travelClassConfigurations.find(
      (x) => x.travelClass.name === currentTravelClassConfiguration.travelClass.name,
    )!,
    createdAt: new Date(createdAt),
    lockedAt: lockedAt ? new Date(lockedAt) : undefined,
    opportunityId,
  }

  return trainTrip
}

const mapTravelClassConfigurationDTO = ({
  travelClass,
  ...slRest
}: TravelClassConfigurationDTO) =>
  ({
    ...slRest,
    travelClass: mapTravelClassDTO(travelClass),
  } as TravelClassConfiguration)

const mapTravelClassDTO = (dto: TravelClassDTO) =>
  ({
    ...dto,
    createdAt: new Date(dto.createdAt),
  } as TravelClass)

interface TrainTripDTO {
  createdAt: string
  currentTravelClassConfiguration: TravelClassConfigurationDTO
  id: string
  startDate: string
  lockedAt?: string
  opportunityId?: string
  pax: Pax
  travelClassConfiguration: TravelClassConfigurationDTO[]
}
interface TravelClassConfigurationDTO {
  travelClass: TravelClassDTO
  price: Price
}
interface TravelClassDTO {
  createdAt: string
  name: TravelClassDefinition
  templateId: string
}
