# pyright: reportMissingModuleSource=false
from algopy import ARC4Contract, arc4, log, UInt64, Global, itxn, Txn, Asset, gtxn, String

SUPPLY = 18_446_744_073_709_551_615 # 2^64 -1
MAX_DISPENSE = 10_000_000_000
INIT = 0
LIVE = 1
class UsdcaMock(ARC4Contract):
    
    def __init__(self) -> None:
        self.dispenser_name = String("USDC_A dispenser localnet")
        self.asset_id = UInt64(0)
        self.dispenser_status = UInt64(INIT)
        
    @arc4.abimethod
    def dispenser_create(self, payMbr: gtxn.PaymentTransaction) -> UInt64:
        assert self.dispenser_status == INIT, "cannot re run this method"
        assert payMbr.amount >= UInt64(100_000), "Asset Mbr not meet"
        app_addr = Global.current_application_address
        asset_itxn = itxn.AssetConfig(
            asset_name=b"MOCK USDC_A",
            unit_name=b"MK_USDCA",
            total=SUPPLY,
            decimals=6,
            manager=app_addr,
            reserve=app_addr,
            clawback=app_addr,
            default_frozen=False,
            fee=0,
        ).submit()
        self.asset_id = asset_itxn.created_asset.id
        log("Mock USDC_A created", self.asset_id, sep=" ")
        self.dispenser_status = UInt64(LIVE)
        return self.asset_id
    
    @arc4.abimethod()
    def dispense(self, amount: UInt64) -> None:
        assert self.dispenser_status == LIVE, "Run create method first"
        assert amount < MAX_DISPENSE, "Max dispense is 10 000 Mock USDC_A"
        asset = Asset(self.asset_id)
        assert Txn.sender.is_opted_in(asset), "User not opt in"
        app_addr = Global.current_application_address
        itxn.AssetTransfer(
            xfer_asset=asset.id,
            asset_amount=amount,
            asset_receiver=Txn.sender,
            asset_sender=app_addr,
            fee=0,
        ).submit()
        return
