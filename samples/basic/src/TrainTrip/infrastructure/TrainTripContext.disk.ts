import TrainTrip, {
  isLocked,
  Price,
  TravelClassConfiguration,
} from "@/TrainTrip/TrainTrip"
import { TrainTripContext } from "@/TrainTrip/usecases/types"
import { DomainEventHandler, Event, configure } from "@fp-app/framework"
import { DiskRecordContext } from "@fp-app/io.diskdb"
import { parse, stringify } from "flatted"
import TravelClassDefinition from "../TravelClassDefinition"
import { TravelClass } from "../Trip"
import { TrainTripView } from "../usecases/getTrainTrip"
import TrainTripReadContext from "./TrainTripReadContext.disk"
import PaxDefinition, { Pax } from "../PaxDefinition"

// Since we assume that saving a valid object, means restoring a valid object
// we can assume data correctness and can skip normal validation and constructing.
// until proven otherwise.
const DiskDBContext = configure(
  function({ eventHandler, readContext, trainTrips }) {
    let disposed = false
    const getAndClearEvents = (): Event[] => {
      return trainTrips.intGetAndClearEvents()
    }
    const save = () =>
      trainTrips.intSave(
        i => readContext.create(i.id, TrainTripToView(i)),
        i => readContext.delete(i.id),
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
    } as TrainTripContext
  },
  () => ({
    eventHandler: DomainEventHandler,
    readContext: TrainTripReadContext,
    trainTrips,
  }),
)

export const trainTrips = () =>
  new DiskRecordContext<TrainTrip>(
    "trainTrip",
    serializeTrainTrip,
    deserializeDbTrainTrip,
  )

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

const serializeTrainTrip = ({ events, ...rest }: any) => stringify(rest)

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
  } = parse(serializedTrainTrip) as TrainTripDTO
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
      x => x.travelClass.name === currentTravelClassConfiguration.travelClass.name,
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
