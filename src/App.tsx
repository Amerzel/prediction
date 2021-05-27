import _ from "lodash";
import classNames from "classnames";
import { useCallback, useEffect, useState } from "react";
import {
  aggregatorV3InterfaceABI,
  binanceBNBUSDURL,
  chainlinkBNBUSDAddress,
  chainlinkBNBUSDADecimals
} from "./api";
import Web3 from "web3";
import "./styles.css";

function App() {
  const [chainlinkBNBUSDPrice, setChainlinkBNBUSDPrice] = useState<number>();
  const [chainlinkBNBUSDRound, setChainlinkBNBUSDRound] = useState<number>();
  const [chainlinkUpdateTimings, setChainlinkUpdateTimings] = useState<
    number[]
  >([]);
  const [chainlinkCurrentTiming, setChainlinkCurrentTiming] = useState<number>(
    0
  );
  const [binanceBNBUSDPrice, setBinanceBNBUSDPrice] = useState<number>();

  const web3 = new Web3("https://bsc-dataseed1.ninicoin.io");
  const priceFeed = new web3.eth.Contract(
    aggregatorV3InterfaceABI,
    chainlinkBNBUSDAddress
  );

  const getChainlinkBNBUSDPrice = useCallback(() => {
    setChainlinkCurrentTiming(chainlinkCurrentTiming + 1);

    priceFeed.methods
      .latestRoundData()
      .call()
      .then((latestRoundData: any) => {
        const chainlinkPrice = _.round(
          parseInt(latestRoundData?.answer, 10) /
            10 ** chainlinkBNBUSDADecimals,
          3
        );
        const chainlinkRound = latestRoundData?.roundId;

        if (chainlinkRound && chainlinkRound !== chainlinkBNBUSDRound) {
          setChainlinkUpdateTimings([
            ...chainlinkUpdateTimings,
            chainlinkCurrentTiming
          ]);
          setChainlinkCurrentTiming(0);
        }

        setChainlinkBNBUSDPrice(chainlinkPrice);
        setChainlinkBNBUSDRound(chainlinkRound);
      });
  }, [
    priceFeed.methods,
    chainlinkBNBUSDRound,
    chainlinkCurrentTiming,
    chainlinkUpdateTimings
  ]);

  const getBinanceBNBUSDPrice = useCallback(() => {
    fetch(binanceBNBUSDURL)
      .then(async (response) => {
        if (response.ok) {
          return await response.json();
        } else {
          const errorMessage = await response.text();
          return Promise.reject(new Error(errorMessage));
        }
      })
      .then((data) => {
        setBinanceBNBUSDPrice(_.round(data?.price, 3));
      });
  }, []);

  useEffect(() => {
    const runChainlinkAPIUpdatesInterval = window.setInterval(
      getChainlinkBNBUSDPrice,
      1000
    );
    const runBinanceAPIUpdatesInterval = window.setInterval(
      getBinanceBNBUSDPrice,
      1000
    );

    return () => {
      window.clearInterval(runChainlinkAPIUpdatesInterval);
      window.clearInterval(runBinanceAPIUpdatesInterval);
    };
  }, [getChainlinkBNBUSDPrice, getBinanceBNBUSDPrice]);

  const cleanedChainlinkUpdateTimings = chainlinkUpdateTimings.slice(1);
  const chainlinkAverageSecondsBetweenUpdates = cleanedChainlinkUpdateTimings.length
    ? _.round(
        _.sum(cleanedChainlinkUpdateTimings) /
          cleanedChainlinkUpdateTimings.length,
        0
      )
    : null;
  const chainlinkUpdatesInSeconds = chainlinkAverageSecondsBetweenUpdates
    ? chainlinkAverageSecondsBetweenUpdates - chainlinkCurrentTiming
    : null;

  const priceDifference =
    binanceBNBUSDPrice && chainlinkBNBUSDPrice
      ? _.round(binanceBNBUSDPrice - chainlinkBNBUSDPrice, 3)
      : null;

  const differenceClass = classNames({
    negative: priceDifference && priceDifference < 0,
    positive: priceDifference && priceDifference >= 0
  });

  return (
    <div className="App">
      <div>
        <div>
          <p>Chainlink BNB/USD Price: {chainlinkBNBUSDPrice}</p>
          <p>Last Updated: {chainlinkCurrentTiming} seconds ago</p>
          <p>
            Average Seconds Between Updates:{" "}
            {chainlinkAverageSecondsBetweenUpdates || "?"}
          </p>
          <p>
            Updates Again In About {chainlinkUpdatesInSeconds || "?"} seconds
          </p>
        </div>
      </div>
      <div>
        <p>Binance BNB/USDT Price: {binanceBNBUSDPrice}</p>
        <p>
          Difference: <span className={differenceClass}>{priceDifference}</span>
        </p>
      </div>
    </div>
  );
}

export default App;
