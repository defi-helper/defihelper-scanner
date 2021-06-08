import { Pagination } from "../../components/pagination";
import React, { useState, useEffect } from "react";
import {
  getContract,
  EventListener,
  getEventListener,
  Event,
  getEventList,
  Contract,
  getEventCount,
} from "../../api";

export interface Props {
  contractId: string;
  eventListenerId: string;
}

export function EventListenerPage({ contractId, eventListenerId }: Props) {
  const [contract, setContract] = useState<Contract | Error | null>(null);
  const [eventListener, setEventListener] =
    useState<EventListener | Error | null>(null);
  const eventsLimit = 10;
  const [eventsPage, setEventsPage] = useState<number>(1);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [event, setEvent] = useState<Event | null>(null);

  const onReloadEventList = () => {
    getEventList(
      contractId,
      eventListenerId,
      eventsLimit,
      (eventsPage - 1) * eventsLimit
    ).then(setEvents);
    getEventCount(contractId, eventListenerId).then(setEventsCount);
  };

  useEffect(() => {
    getContract(contractId)
      .then((contract) => {
        setContract(contract);
        getEventListener(contractId, eventListenerId)
          .then((eventListener) => {
            setEventListener(eventListener);
            onReloadEventList();
          })
          .catch(() => setEventListener(new Error("Event listener not found")));
      })
      .catch(() => setContract(new Error("Contract not found")));
  }, []);

  useEffect(() => {
    onReloadEventList();
  }, [eventsPage]);

  if (contract === null || eventListener === null) {
    return <div className="container">Loading...</div>;
  }
  if (contract instanceof Error) {
    return <div className="container">{contract.message}</div>;
  }
  if (eventListener instanceof Error) {
    return <div className="container">{eventListener.message}</div>;
  }

  return (
    <div className="container">
      <div>
        <a href={`/`}>Main</a>
        {" > "}
        <a href={`/contract/${contractId}`}>{contract.name}</a>
      </div>
      {!event || (
        <div>
          <h3>Arguments:</h3>
          {Object.entries(event.args).map(([k, v]) => (
            <div className="row" key={k}>
              <div className="column">{k}</div>
              <div className="column">{v}</div>
            </div>
          ))}
        </div>
      )}
      <div>
        <h3>Events:</h3>
        <table>
          <thead>
            <tr>
              <th>Sender</th>
              <th>Block</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                className="pointer hover"
                key={event.id}
                onClick={() => setEvent(event)}
              >
                <td>{event.address}</td>
                <td>{event.blockNumber}</td>
                <td>{event.transactionHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          count={eventsCount}
          limit={eventsLimit}
          page={eventsPage}
          onPrev={setEventsPage}
          onNext={setEventsPage}
        />
      </div>
    </div>
  );
}
