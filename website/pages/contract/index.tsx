import BigNumber from "bignumber.js";
import { Pagination } from "../../components/pagination";
import React, { useState, useEffect, useReducer } from "react";
import {
  getCurrentBlock,
  Contract,
  getContract,
  EventListener,
  getEventListenerList,
  deleteEventListener,
  createEventListener,
  updateEventListener,
  getEventListenerCount,
  restartQueueTask,
} from "../../api";
import { Modal } from "../../components/modal";
import moment from "moment";

interface EventListenerState {
  id?: string;
  name: string;
  syncHeight: number;
}

type EventListenerAction =
  | { type: "setName"; value: string }
  | { type: "setSyncHeight"; value: number };

function EventListenerForm(props: {
  contract: Contract;
  state: EventListenerState;
  error: string;
  onSave: (eventListenerState: EventListenerState) => any;
}) {
  const events = props.contract.abi
    .filter(({ type }) => type === "event")
    .map(({ name }) => name);
  const [eventListenerState, eventListenerDispatcher] = useReducer(
    (state: EventListenerState, action: EventListenerAction) => {
      switch (action.type) {
        case "setName":
          return { ...state, name: action.value };
        case "setSyncHeight":
          return { ...state, syncHeight: action.value };
        default:
          return state;
      }
    },
    props.state
  );

  return (
    <form action="#">
      <fieldset>
        <label htmlFor="listener-name">Name</label>
        <select
          id="listener-name"
          value={eventListenerState.name}
          onChange={(e) =>
            eventListenerDispatcher({
              type: "setName",
              value: e.target.value,
            })
          }
        >
          {events.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
        <label htmlFor="contract-height">Sync height</label>
        <input
          id="contract-sync"
          type="text"
          placeholder="Sync height..."
          value={eventListenerState.syncHeight}
          onChange={(e) =>
            eventListenerDispatcher({
              type: "setSyncHeight",
              value: parseInt(e.target.value, 10),
            })
          }
        />
        <div style={{ color: "red" }}>{props.error}</div>
        <button onClick={() => props.onSave(eventListenerState)}>Save</button>
      </fieldset>
    </form>
  );
}

function EventListenerComponent({
  contract,
  eventListener,
  currentBlock,
  onUpdate,
  onDelete,
  onView,
  onRestart,
}: {
  contract: Contract;
  eventListener: EventListener;
  currentBlock: number;
  onUpdate: (listener: EventListener) => any;
  onDelete: (listener: EventListener) => any;
  onView: (listener: EventListener) => any;
  onRestart: (listener: EventListener) => any;
}) {
  const progress =
    currentBlock === 0
      ? 0
      : new BigNumber(eventListener.syncHeight)
          .minus(contract.startHeight)
          .div(new BigNumber(currentBlock).minus(contract.startHeight))
          .multipliedBy(100)
          .toFixed(0);

  return (
    <tr>
      <td>
        <a href={`/contract/${contract.id}/event-listener/${eventListener.id}`}>
          {eventListener.name}
        </a>
      </td>
      <td>
        <div className="progress">
          <span
            className={
              currentBlock - eventListener.syncHeight < 100 ? "green" : "red"
            }
            style={{
              width: `${progress}%`,
            }}
          ></span>
        </div>
        <div style={{ textAlign: "center" }}>
          {eventListener.syncHeight}/{currentBlock}
        </div>
      </td>
      <td>{eventListener.lastTask?.status}</td>
      <td>
        {eventListener.lastTask?.updatedAt &&
          moment(eventListener.lastTask?.updatedAt).fromNow()}
      </td>
      <td>
        <div>
          <button className="button" onClick={() => onUpdate(eventListener)}>
            Update
          </button>
          <button
            className="button button-outline"
            onClick={() => onDelete(eventListener)}
          >
            Delete
          </button>

          <button
            className="button button-outline"
            onClick={() => onView(eventListener)}
            disabled={!eventListener.lastTask}
          >
            View last task
          </button>

          <button
            className="button button-outline"
            onClick={() => onRestart(eventListener)}
            disabled={!eventListener.lastTask}
          >
            Restart task
          </button>
        </div>
      </td>
    </tr>
  );
}

export interface Props {
  contractId: string;
}

export function ContractPage({ contractId }: Props) {
  const [name, setName] = useState<string>("0");
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [contract, setContract] = useState<Contract | Error | null>(null);
  const [viewListenerLastTask, setViewListenerLastTask] =
    useState<EventListener | null>(null);
  const eventListenersLimit = 10;
  const [eventListenersPage, setEventListenersPage] = useState<number>(1);
  const [eventListeners, setEventListeners] = useState<EventListener[]>([]);
  const [eventListenersCount, setEventListenersCount] = useState<number>(0);
  const [eventListenerForm, setEventListenerForm] =
    useState<EventListenerState | null>(null);
  const [addModalError, setAddModalError] = useState<string>("");

  const onReloadEventListenerList = () => {
    const filter = {
      name: name !== "0" ? name : undefined,
    };
    getEventListenerList(
      contractId,
      filter,
      eventListenersLimit,
      (eventListenersPage - 1) * eventListenersLimit
    ).then(setEventListeners);
    getEventListenerCount(contractId, filter).then(setEventListenersCount);
  };

  const onDelete = async (eventListener: EventListener) => {
    if (contract === null || contract instanceof Error) return;
    if (!confirm("Are you sure?")) return;

    await deleteEventListener(contract.id, eventListener.id);
    onReloadEventListenerList();
  };

  const onRestart = async (eventListener: EventListener) => {
    if (!eventListener?.lastTask) return;
    await restartQueueTask(eventListener.lastTask.taskId);
    alert("done");
  };

  const onSave = async (state: EventListenerState) => {
    if (contract === null || contract instanceof Error) return;

    setAddModalError("");
    try {
      if (state.id !== undefined) {
        await updateEventListener(
          contract.id,
          state.id,
          state.name,
          state.syncHeight
        );
      } else {
        await createEventListener(contract.id, state.name, state.syncHeight);
      }
      setEventListenerForm(null);
      onReloadEventListenerList();
    } catch (e) {
      setAddModalError(e.response.data);
    }
  };

  useEffect(() => {
    getContract(contractId)
      .then((contract) => {
        setContract(contract);
        getCurrentBlock(contract.network)
          .then(({ currentBlock }) => setCurrentBlock(currentBlock))
          .catch(() => console.error("Network not supported"));
        onReloadEventListenerList();
      })
      .catch(() => setContract(new Error("Contract not found")));
  }, []);

  useEffect(() => {
    if (contract === null || contract instanceof Error) return;

    onReloadEventListenerList();
  }, [eventListenersPage, name]);

  if (contract === null) {
    return <div className="container">Loading...</div>;
  }
  if (contract instanceof Error) {
    return <div className="container">{contract.message}</div>;
  }

  const eventNames = contract.abi
    .filter(({ type }) => type === "event")
    .map(({ name }) => name);

  return (
    <div className="container">
      <div>
        <a href="/">Main</a>
      </div>
      <div>
        <h3>
          Listeners of {contract.name} at network {contract.network}
        </h3>
        <div className="row">
          <div className="column">
            <select onChange={(e) => setName(e.target.value)} value={name}>
              <option value="">All</option>
              {eventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Sync progress</th>
              <th>Queue status</th>
              <th>Queue updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventListeners.map((eventListener) => (
              <EventListenerComponent
                eventListener={eventListener}
                contract={contract}
                currentBlock={currentBlock}
                key={eventListener.id}
                onUpdate={(eventListener) =>
                  setEventListenerForm(eventListener)
                }
                onView={() => setViewListenerLastTask(eventListener)}
                onRestart={onRestart}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
        <Pagination
          count={eventListenersCount}
          limit={eventListenersLimit}
          page={eventListenersPage}
          onPrev={setEventListenersPage}
          onNext={setEventListenersPage}
        />
        <div>
          <button
            onClick={() =>
              setEventListenerForm({
                name: (
                  contract.abi.find(({ type }) => type === "event") ?? {
                    name: "",
                  }
                ).name,
                syncHeight: contract.startHeight,
              })
            }
          >
            Add
          </button>
        </div>
      </div>
      {!contract || (
        <Modal
          header={<h3>Add event listener</h3>}
          isVisible={eventListenerForm !== null}
          onClose={() => setEventListenerForm(null)}
        >
          {eventListenerForm === null || (
            <EventListenerForm
              contract={contract}
              state={eventListenerForm}
              onSave={onSave}
              error={addModalError}
            />
          )}
        </Modal>
      )}

      <Modal
        header={<h3>View last task</h3>}
        isVisible={viewListenerLastTask}
        onClose={() => setViewListenerLastTask(null)}
      >
        <h4>Status: {viewListenerLastTask?.lastTask?.status}</h4>
        <hr />

        <h4>Info:</h4>
        <textarea
          style={{ width: "100%", resize: "vertical" }}
          value={viewListenerLastTask?.lastTask?.info}
          rows="20"
        />
        <hr />

        <h4>Error:</h4>
        <textarea
          style={{ width: "100%", resize: "vertical" }}
          rows="20"
          value={viewListenerLastTask?.lastTask?.error}
        />
      </Modal>
    </div>
  );
}
