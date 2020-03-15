import TrainTrip, { TravelClassConfiguration } from "@/TrainTrip/TrainTrip"
import { TrainTripContext } from "@/TrainTrip/usecases/types"
import {
  autoinject,
  ContextBase,
  DomainEventHandler,
  Event,
  RecordContext,
} from "@fp-app/framework"
import { DiskRecordContext } from "@fp-app/io.diskdb"
import { unsafeUnwrapDecode } from "@fp-app/fp-ts-extensions"
import { parse, stringify } from "flatted"
import PaxDefinition from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { TravelClass } from "../Trip"
import { TrainTripView } from "../usecases/getTrainTrip"
import TrainTripReadContext from "./TrainTripReadContext.disk"
import { DateFromISOString } from "@fp-app/fp-ts-extensions/src/Io"

// Since we assume that saving a valid object, means restoring a valid object
// we can assume data correctness and can skip normal validation and constructing.
// until proven otherwise.
// tslint:disable-next-line:max-classes-per-file
@autoinject
export default class DiskDBContext extends ContextBase implements TrainTripContext {
  get trainTrips() {
    return this.trainTripsi as RecordContext<TrainTrip>
  }

  private readonly trainTripsi = new DiskRecordContext<TrainTrip>(
    "trainTrip",
    serializeTrainTrip,
    deserializeDbTrainTrip,
  )
  constructor(
    private readonly readContext: TrainTripReadContext,
    eventHandler: DomainEventHandler,
    // test sample
    // @paramInject(sendCloudSyncKey) sendCloudSync: typeof sendCloudSyncKey,
  ) {
    super(eventHandler)
  }

  protected getAndClearEvents(): Event[] {
    return this.trainTripsi.intGetAndClearEvents()
  }
  protected saveImpl(): Promise<void> {
    return this.trainTripsi.intSave(
      i => this.readContext.create(i.id, TrainTripToView(i)),
      i => this.readContext.delete(i.id),
    )
  }
}

const TrainTripToView = (trip: TrainTrip): TrainTripView => {
  const {
    createdAt,
    currentTravelClassConfiguration,
    id,
    isLocked,
    pax,
    startDate,
    travelClassConfiguration,
  } = trip
  return {
    id,

    allowUserModification: !isLocked,
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
    pax,
    unsafeUnwrapDecode(DateFromISOString.decode(startDate)),
    travelClassConfigurations,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    travelClassConfigurations.find(
      x => x.travelClass.name === currentTravelClassConfiguration.travelClass.name,
    )!,
    {
      ...rest,
      createdAt: unsafeUnwrapDecode(DateFromISOString.decode(createdAt)),
      lockedAt: lockedAt
        ? unsafeUnwrapDecode(DateFromISOString.decode(lockedAt))
        : undefined,
    },
  )

  return trainTrip
}

const mapTravelClassConfigurationDTO = ({
  travelClass,
  ...slRest
}: {
  travelClass: TravelClassDTO
}) => {
  const slc = TravelClassConfiguration.decode({
    ...slRest,
    // TODO: The travelClass should actually be a reference to an existing / shared object.
    travelClass: mapTravelClassDTO(travelClass),
  })
  return unsafeUnwrapDecode(slc)
}

const mapTravelClassDTO = (dto: TravelClassDTO): TravelClass =>
  unsafeUnwrapDecode(TravelClass.fromWire(dto))

interface TrainTripDTO {
  createdAt: string
  currentTravelClassConfiguration: TravelClassConfigurationDTO
  id: string
  trip: TripDTO
  startDate: string
  lockedAt?: string
  pax: PaxDefinition
  travelClassConfiguration: TravelClassConfigurationDTO[]
}
interface TravelClassConfigurationDTO {
  travelClass: TravelClassDTO
}
interface TripDTO {
  travelClasses: TravelClassDTO[]
}
interface TravelClassDTO {
  createdAt: string
  name: TravelClassDefinition
  templateId: string
}
