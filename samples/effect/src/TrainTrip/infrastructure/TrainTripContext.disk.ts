import TrainTrip, { TravelClassConfiguration, Price } from "@e/TrainTrip/TrainTrip"
import { TrainTripContext as TrainTripContextType } from "@e/TrainTrip/usecases/types"
import { RecordNotFound } from "@fp-app/framework"
import * as diskdb from "@fp-app/io.diskdb"
import TravelClassDefinition from "../TravelClassDefinition"
import { TravelClass } from "../Trip"
import { TrainTripView } from "../usecases/GetTrainTrip"
import TrainTripReadContext from "./TrainTripReadContext.disk"
import PaxDefinition, { Pax } from "../PaxDefinition"
import { T, F, O } from "@e/meffect"
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
const TrainTripContext_ = F.define({
  [TrainTripContextURI]: {
    add: F.fn<(tt: TrainTrip) => T.UIO<void>>(),
    load: F.fn<(id: string) => T.UIO<O.Option<TrainTrip>>>(),
    remove: F.fn<(tt: TrainTrip) => T.UIO<void>>(),
    save: F.fn<() => T.UIO<void>>(),
    registerChanged: F.fn<(tt: TrainTrip) => T.UIO<void>>(),
  },
})
export interface TrainTripContext extends F.TypeOf<typeof TrainTripContext_> {}

export const TrainTripContext = F.opaque<TrainTripContext>()(TrainTripContext_)

export const { add, load, registerChanged, remove, save } = F.access(TrainTripContext)[
  TrainTripContextURI
]

export const loadE = (id: string) =>
  pipe(
    load(id),
    T.chain(
      O.fold(
        () =>
          T.raiseError<RecordNotFound, TrainTrip>(new RecordNotFound("trainTrip", id)),
        (x) => T.pure(x),
      ),
    ),
  )

export const contextEnv = "@fp-app/effect/traintrip-context/ctx"

export interface Context {
  [contextEnv]: {
    ctx: TrainTripContextType
  }
}

export const env = {
  [TrainTripContextURI]: {
    add: (tt: TrainTrip) =>
      T.accessM((r: Context) => T.pure(r[contextEnv].ctx.trainTrips.add(tt))),
    load: (id: string) =>
      T.accessM((r: Context) => T.encaseTask(r[contextEnv].ctx.trainTrips.load(id))),
    remove: (tt: TrainTrip) =>
      T.accessM((r: Context) => T.pure(r[contextEnv].ctx.trainTrips.remove(tt))),
    save: () => T.accessM((r: Context) => T.encaseTask(r[contextEnv].ctx.save)),

    registerChanged: (tt: TrainTrip) =>
      T.accessM((r: Context) =>
        T.sync(() => r[contextEnv].ctx.trainTrips.registerChanged(tt)),
      ),
  },
}
export const provideTrainTripContext = F.implement(TrainTripContext)(env)

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
