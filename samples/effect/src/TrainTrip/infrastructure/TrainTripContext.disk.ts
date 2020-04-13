import TrainTrip, {
  isLocked,
  Price,
  TravelClassConfiguration,
} from "@/TrainTrip/TrainTrip"
import { TrainTripContext as TrainTripContextType } from "@/TrainTrip/usecases/types"
import { DomainEventHandler, Event, configure } from "@fp-app/framework"
import * as diskdb from "@fp-app/io.diskdb"
import TravelClassDefinition from "../TravelClassDefinition"
import { TravelClass } from "../Trip"
import { TrainTripView } from "../usecases/GetTrainTrip"
import TrainTripReadContext from "./TrainTripReadContext.disk"
import PaxDefinition, { Pax } from "../PaxDefinition"
import { T, F, O } from "@/meffect"

// Since we assume that saving a valid object, means restoring a valid object
// we can assume data correctness and can skip normal validation and constructing.
// until proven otherwise.
const DiskDBContext = configure(
  function TrainTripContext({ eventHandler, readContext, trainTrips }) {
    let disposed = false
    const getAndClearEvents = (): Event[] => {
      return trainTrips.intGetAndClearEvents()
    }
    const save = () =>
      trainTrips.intSave(
        (i) => readContext.create(i.id, TrainTripToView(i)),
        (i) => readContext.delete(i.id),
      )
    const dispose = () => (disposed = true)
    return {
      getAndClearEvents,
      save: () => {
        if (disposed) {
          throw new Error("The context is already disposed")
        }
        return eventHandler.commitAndPostEvents(getAndClearEvents, save)
      },
      trainTrips,
      dispose,
    } as TrainTripContextType
  },
  () => ({
    eventHandler: DomainEventHandler,
    readContext: TrainTripReadContext,
    trainTrips,
  }),
)

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
    save: F.fn<() => T.UIO<void>>(),
  },
})
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TrainTripContext extends F.TypeOf<typeof TrainTripContext_> {}

export const TrainTripContext = F.opaque<TrainTripContext>()(TrainTripContext_)

export const { add, load, save } = F.access(TrainTripContext)[TrainTripContextURI]

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
    save: () => T.accessM((r: Context) => T.encaseTask(r[contextEnv].ctx.save)),
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

    allowUserModification: !isLocked(trip),
    createdAt,

    pax,
    startDate,
    travelClass: currentTravelClassConfiguration.travelClass.name,
    travelClasses: travelClassConfiguration.map(
      ({ travelClass: { name, templateId } }) => ({ templateId, name }),
    ),
  }
}

// Need access to private events here..
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeTrainTrip = ({ events: _, ...rest }: any) => diskdb.stringify(rest)

function deserializeDbTrainTrip(serializedTrainTrip: string) {
  const {
    createdAt,
    currentTravelClassConfiguration,
    id,
    lockedAt,
    pax,
    startDate,
    travelClassConfiguration,
    ...rest
  } = diskdb.parse<TrainTripDTO>(serializedTrainTrip)
  // what do we do? we restore all properties that are just property bags
  // and we recreate proper object graph for properties that have behaviors
  // TODO: use type information or configuration, probably a library ;-)

  const travelClassConfigurations = travelClassConfiguration.map(
    mapTravelClassConfigurationDTO,
  )
  const trainTrip = new TrainTrip(
    id,
    pax as PaxDefinition,
    new Date(startDate),
    travelClassConfigurations,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    travelClassConfigurations.find(
      (x) => x.travelClass.name === currentTravelClassConfiguration.travelClass.name,
    )!,
    new Date(createdAt),
    {
      ...rest,
      lockedAt: lockedAt ? new Date(lockedAt) : undefined,
    },
  )

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
